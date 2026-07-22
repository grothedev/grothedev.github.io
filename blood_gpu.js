// This code demonstrates how to implement the blood simulation using WebGPU
// Note: WebGPU is still evolving and requires modern browsers with WebGPU enabled

export class WebGPUBloodSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.particles = [];
    this.splatters = [];
    
    // Simulation parameters
    this.particleCount = 10000; // Much higher with GPU acceleration
    this.gravity = 0.15;
    this.viscosity = 0.92;
    this.particleSize = 3;
    this.sprayForce = 10;
    this.splatterSize = 5;
    this.spread = 0.3;
    
    // WebGPU state
    this.device = null;
    this.context = null;
    this.particleBuffer = null;
    this.computePipeline = null;
    this.renderPipeline = null;
    this.uniformBuffer = null;
    this.bindGroups = [];
    
    // Double buffering for particles (read from one, write to the other)
    this.particleBuffers = [null, null];
    this.currentBuffer = 0;
    
    this.animationId = null;
    this.paused = false;
    
    // Initialize WebGPU
    this.initWebGPU();
  }
  
  async initWebGPU() {
    try {
      this.context = this.canvas.getContext('webgpu');
      // Check if WebGPU is supported
      if (!navigator.gpu) {
        console.log(navigator);
        throw new Error("WebGPU not supported on this browser.");
      }
      
      // Request adapter
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error("No appropriate GPU adapter found.");
      }
      
      // Request device
      this.device = await adapter.requestDevice();
      console.log(this.device);
      
      // Configure canvas context
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: canvasFormat,
        alphaMode: 'premultiplied'
      });
      
      // Initialize particle buffer
      await this.initializeParticles();
      
      // Create shader modules
      await this.createShaders();
      
      // Create uniform buffer (simulation parameters)
      this.createUniformBuffer();
      
      // Start rendering
      this.startAnimation();
      
      console.log("WebGPU Blood Simulation initialized successfully");
    } catch (error) {
      console.error("Failed to initialize WebGPU:", error);
      // Fallback to Canvas2D implementation if WebGPU isn't available
    }
  }
  
  async initializeParticles() {
    // Create structured particle buffer
    const particleBufferSize = this.particleCount * 8 * Float32Array.BYTES_PER_ELEMENT; // position(2), velocity(2), color(3), life(1)
    
    // Create double buffered particles for ping-pong computation
    this.particleBuffers[0] = this.device.createBuffer({
      size: particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    this.particleBuffers[1] = this.device.createBuffer({
      size: particleBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });
    
    // Initialize particles on CPU then upload to GPU
    const particleData = new Float32Array(this.particleCount * 8);
    for (let i = 0; i < this.particleCount; i++) {
      const baseIndex = i * 8;
      // Position (off-screen initially)
      particleData[baseIndex] = -100;
      particleData[baseIndex + 1] = -100;
      // Velocity
      particleData[baseIndex + 2] = 0;
      particleData[baseIndex + 3] = 0;
      // Color (red with slight variation)
      particleData[baseIndex + 4] = 0.8 + Math.random() * 0.2; // r
      particleData[baseIndex + 5] = 0.0 + Math.random() * 0.1; // g
      particleData[baseIndex + 6] = 0.0 + Math.random() * 0.05; // b
      // Life
      particleData[baseIndex + 7] = 0.0; // Initially inactive
    }
    
    // Upload initial particle data
    this.device.queue.writeBuffer(this.particleBuffers[0], 0, particleData);
    this.device.queue.writeBuffer(this.particleBuffers[1], 0, particleData);
    
    // Create vertex buffer for particle rendering
    this.vertexBuffer = this.device.createBuffer({
      size: 6 * 2 * Float32Array.BYTES_PER_ELEMENT, // 6 vertices for quad, 2 floats per vertex
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    
    // Create a quad (two triangles) for each particle
    const vertexData = new Float32Array(this.vertexBuffer.getMappedRange());
    // Triangle 1
    vertexData[0] = -1; vertexData[1] = -1; // bottom-left
    vertexData[2] = 1;  vertexData[3] = -1; // bottom-right
    vertexData[4] = -1; vertexData[5] = 1;  // top-left
    // Triangle 2
    vertexData[6] = -1; vertexData[7] = 1;  // top-left
    vertexData[8] = 1;  vertexData[9] = -1; // bottom-right
    vertexData[10] = 1; vertexData[11] = 1; // top-right
    
    this.vertexBuffer.unmap();
  }
  
  async createShaders() {
    // Create compute shader for particle physics
    const computeShaderModule = this.device.createShaderModule({
      label: "Blood Particle Compute Shader",
      code: `
        struct Particle {
          position: vec2f,
          velocity: vec2f,
          color: vec3f,
          life: f32,
        };
        
        struct SimParams {
          deltaTime: f32,
          gravity: f32,
          viscosity: f32,
          canvasWidth: f32,
          canvasHeight: f32,
          mouseX: f32,
          mouseY: f32,
          mouseDown: f32,
          forceMultiplier: f32,
          particleCount: f32,
        };
        
        @group(0) @binding(0) var<storage, read> particlesA: array<Particle>;
        @group(0) @binding(1) var<storage, read_write> particlesB: array<Particle>;
        @group(0) @binding(2) var<uniform> params: SimParams;
        
        // Random number generation on GPU
        fn rand(seed: f32) -> f32 {
          return fract(sin(seed * 78.233) * 43758.5453);
        }
        
        @compute @workgroup_size(64)
        fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
          let index = global_id.x;
          if (index >= u32(params.particleCount)) {
            return;
          }
          
          var particle = particlesA[index];
          
          // Skip inactive particles
          if (particle.life <= 0.0) {
            // Check if we should spawn a new particle at mouse position
            if (params.mouseDown > 0.5) {
              let spawnChance = rand(f32(index) + params.deltaTime);
              if (spawnChance < 0.05) { // Control spawn rate
                // Create new particle at mouse position
                particle.position = vec2f(params.mouseX, params.mouseY);
                
                // Random direction with bias towards mouse movement
                let angle = rand(f32(index) * params.deltaTime) * 6.283185;
                let force = params.forceMultiplier * (0.5 + rand(f32(index) + 0.1) * 0.5);
                
                // Set random velocity
                particle.velocity.x = cos(angle) * force;
                particle.velocity.y = sin(angle) * force;
                
                // Set color (red with variation)
                particle.color.x = 0.8 + rand(f32(index) + 0.2) * 0.2;
                particle.color.y = rand(f32(index) + 0.3) * 0.1;
                particle.color.z = rand(f32(index) + 0.4) * 0.05;
                
                // Set life
                particle.life = 1.0;
              }
            }
          } else {
            // Apply physics to active particles
            
            // Apply gravity
            particle.velocity.y += params.gravity;
            
            // Apply viscosity (air resistance)
            particle.velocity *= params.viscosity;
            
            // Update position
            particle.position += particle.velocity;
            
            // Check boundaries
            if (particle.position.y > params.canvasHeight) {
              // Hit bottom - create splatter (handled on CPU for now)
              particle.life = -1.0; // Special value to signal splatter creation on CPU
            } else if (particle.position.x < 0.0 || particle.position.x > params.canvasWidth) {
              // Hit sides
              particle.life = -1.0;
            } else {
              // Decay life
              particle.life -= 0.005;
            }
          }
          
          // Write updated particle
          particlesB[index] = particle;
        }
      `
    });
    
    // Create vertex/fragment shader for rendering
    const renderShaderModule = this.device.createShaderModule({
      label: "Blood Particle Render Shader",
      code: `
        struct VertexOutput {
          @builtin(position) position: vec4f,
          @location(0) color: vec3f,
          @location(1) quadPosition: vec2f,
        };
        
        struct Particle {
          position: vec2f,
          velocity: vec2f,
          color: vec3f,
          life: f32,
        };
        
        struct SimParams {
          deltaTime: f32,
          gravity: f32,
          viscosity: f32,
          canvasWidth: f32,
          canvasHeight: f32,
          mouseX: f32,
          mouseY: f32,
          mouseDown: f32,
          forceMultiplier: f32,
          particleCount: f32,
        };
        
        @group(0) @binding(0) var<storage, read> particles: array<Particle>;
        @group(0) @binding(2) var<uniform> params: SimParams;
        
        @vertex
        fn vertexMain(
          @location(0) position: vec2f,
          @builtin(instance_index) instance: u32
        ) -> VertexOutput {
          var output: VertexOutput;
          
          let particle = particles[instance];
          
          // Only process active particles
          if (particle.life <= 0.0) {
            // Place inactive particles offscreen
            output.position = vec4f(-10.0, -10.0, 0.0, 1.0);
            output.color = vec3f(0.0);
            output.quadPosition = vec2f(0.0);
            return output;
          }
          
          // Particle size based on life
          let size = 3.0 * particle.life;
          
          // Transform quad to particle position and size
          let worldPosition = particle.position + position * size;
          
          // Convert to clip space
          let clipPosition = vec2f(
            worldPosition.x / params.canvasWidth * 2.0 - 1.0,
            -(worldPosition.y / params.canvasHeight * 2.0 - 1.0) // Y is flipped in clip space
          );
          
          output.position = vec4f(clipPosition, 0.0, 1.0);
          output.color = particle.color;
          output.quadPosition = position;
          
          return output;
        }
        
        @fragment
        fn fragmentMain(in: VertexOutput) -> @location(0) vec4f {
          // Calculate distance from center of quad for circular particles
          let distFromCenter = length(in.quadPosition);
          
          // Smooth circle with soft edges
          let alpha = smoothstep(1.0, 0.8, distFromCenter) * in.color.r;
          
          return vec4f(in.color, alpha);
        }
      `
    });
    
    // Create compute pipeline
    this.computePipeline = this.device.createComputePipeline({
      label: "Blood Particle Compute Pipeline",
      layout: 'auto',
      compute: {
        module: computeShaderModule,
        entryPoint: 'computeMain',
      }
    });
    
    // Create render pipeline
    this.renderPipeline = this.device.createRenderPipeline({
      label: "Blood Particle Render Pipeline",
      layout: 'auto',
      vertex: {
        module: renderShaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      /*fragment: {
        module: renderShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'src-alpha',
                dstFactor: 'one',
                operation: 'add',
              },
            },
          },
        ],
      },*/
    });
  }
  
  createUniformBuffer() {
    this.uniformBuffer = this.device.createBuffer({
      size: 10 * Float32Array.BYTES_PER_ELEMENT, // 10 parameters
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    // Initial values
    this.updateUniformBuffer();
    
    // Create bind groups for double buffering
    for (let i = 0; i < 2; i++) {
      this.bindGroups[i] = this.device.createBindGroup({
        layout: this.computePipeline.getBindGroupLayout(0),
        entries: [
          {
            binding: 0,
            resource: { buffer: this.particleBuffers[i] }
          },
          {
            binding: 1,
            resource: { buffer: this.particleBuffers[(i + 1) % 2] }
          },
          {
            binding: 2,
            resource: { buffer: this.uniformBuffer }
          },
        ],
      });
    }
    
    // Create render bind group
    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.particleBuffers[0] }
        },
        {
          binding: 2,
          resource: { buffer: this.uniformBuffer }
        },
      ],
    });
  }
  
  updateUniformBuffer(mouseX = 0, mouseY = 0, mouseDown = 0) {
    // Create typed array for uniform data
    const uniformData = new Float32Array([
      0.016, // deltaTime (assuming 60fps)
      this.gravity,
      this.viscosity,
      this.canvas.width,
      this.canvas.height,
      mouseX,
      mouseY,
      mouseDown,
      this.sprayForce,
      this.particleCount,
    ]);
    
    // Upload to GPU
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }
  
  simulate(mouseX = 0, mouseY = 0, mouseDown = 0) {
    if (this.paused) return;
    
    // Update parameters
    this.updateUniformBuffer(mouseX, mouseY, mouseDown);
    
    // Begin command encoding
    const commandEncoder = this.device.createCommandEncoder();
    
    // Run compute shader
    const computePass = commandEncoder.beginComputePass();
    computePass.setPipeline(this.computePipeline);
    computePass.setBindGroup(0, this.bindGroups[this.currentBuffer]);
    computePass.dispatchWorkgroups(Math.ceil(this.particleCount / 64));
    computePass.end();
    
    // Swap buffers
    this.currentBuffer = (this.currentBuffer + 1) % 2;
    
    // Update render bind group to use current particle buffer
    this.renderBindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.particleBuffers[this.currentBuffer] }
        },
        {
          binding: 2,
          resource: { buffer: this.uniformBuffer }
        },
      ],
    });
    
    // Render particles
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    
    renderPass.setPipeline(this.renderPipeline);
    renderPass.setBindGroup(0, this.renderBindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(6, this.particleCount, 0, 0); // 6 vertices per particle (2 triangles)
    renderPass.end();
    
    // Submit GPU commands
    this.device.queue.submit([commandEncoder.finish()]);
  }
  
  startAnimation() {
    if (this.paused) return;
    
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseDown = 0;
    
    // Handle mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      mouseDown = 1;
      lastMouseX = e.offsetX;
      lastMouseY = e.offsetY;
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      lastMouseX = e.offsetX;
      lastMouseY = e.offsetY;
    });
    
    this.canvas.addEventListener('mouseup', () => {
      mouseDown = 0;
    });
    
    this.canvas.addEventListener('mouseleave', () => {
      mouseDown = 0;
    });
    
    // Animation loop
    const animate = () => {
      this.simulate(lastMouseX, lastMouseY, mouseDown);
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  togglePause() {
    this.paused = !this.paused;
    if (!this.paused) {
      this.startAnimation();
    }
  }
  
  createBloodBurst(x, y) {
    // Create a burst from a specific location
    // We'll need to handle this via transferring data to the GPU
    // This method would modify particle data on the CPU then upload to GPU
    
    const particleData = new Float32Array(this.particleCount * 8);
    let activeCount = 0;
    const maxBurstParticles = Math.min(this.particleCount, 2000);
    
    // First read existing particle data
    const readBuffer = this.device.createBuffer({
      size: this.particleCount * 8 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    
    const commandEncoder = this.device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(
      this.particleBuffers[this.currentBuffer], 0,
      readBuffer, 0,
      this.particleCount * 8 * Float32Array.BYTES_PER_ELEMENT
    );
    this.device.queue.submit([commandEncoder.finish()]);
    
    // Wait for the buffer to be mapped
    readBuffer.mapAsync(GPUMapMode.READ).then(() => {
      const mappedArray = new Float32Array(readBuffer.getMappedRange());
      
      // Copy existing particles
      for (let i = 0; i < this.particleCount; i++) {
        const baseIndex = i * 8;
        // If particle is active, preserve it
        if (mappedArray[baseIndex + 7] > 0) {
          for (let j = 0; j < 8; j++) {
            particleData[baseIndex + j] = mappedArray[baseIndex + j];
          }
          activeCount++;
        }
      }
      
      // Add burst particles
      for (let i = activeCount; i < activeCount + maxBurstParticles && i < this.particleCount; i++) {
        const baseIndex = i * 8;
        // Position
        particleData[baseIndex] = x;
        particleData[baseIndex + 1] = y;
        
        // Velocity - random in all directions
        const angle = Math.random() * Math.PI * 2;
        const force = 5 + Math.random() * 15;
        particleData[baseIndex + 2] = Math.cos(angle) * force;
        particleData[baseIndex + 3] = Math.sin(angle) * force;
        
        // Color - red with variation
        particleData[baseIndex + 4] = 0.8 + Math.random() * 0.2; // r
        particleData[baseIndex + 5] = Math.random() * 0.1; // g
        particleData[baseIndex + 6] = Math.random() * 0.05; // b
        
        // Life
        particleData[baseIndex + 7] = 1.0;
      }
      
      readBuffer.unmap();
      
      // Write the updated particle data to the GPU
      this.device.queue.writeBuffer(this.particleBuffers[this.currentBuffer], 0, particleData);
    });
  }
  
  clear() {
    // Reset all particles to inactive
    const particleData = new Float32Array(this.particleCount * 8);
    for (let i = 0; i < this.particleCount; i++) {
      const baseIndex = i * 8;
      // Position (off-screen)
      particleData[baseIndex] = -100;
      particleData[baseIndex + 1] = -100;
      // Velocity
      particleData[baseIndex + 2] = 0;
      particleData[baseIndex + 3] = 0;
      // Color
      particleData[baseIndex + 4] = 0.8 + Math.random() * 0.2;
      particleData[baseIndex + 5] = 0;
      particleData[baseIndex + 6] = 0;
      // Life (inactive)
      particleData[baseIndex + 7] = 0;
    }
    
    // Upload to both buffers
    this.device.queue.writeBuffer(this.particleBuffers[0], 0, particleData);
    this.device.queue.writeBuffer(this.particleBuffers[1], 0, particleData);
  }
  
  // Methods to adjust simulation parameters
  setGravity(value) {
    this.gravity = value;
  }
  
  setViscosity(value) {
    this.viscosity = value;
  }
  
  setParticleCount(value) {
    // WebGPU allows for much higher particle counts
    this.particleCount = Math.min(value, 100000);
  }
  
  setSprayForce(value) {
    this.sprayForce = value;
  }
}

//make the class accessible to the browser
window.WebGPUBloodSimulation = WebGPUBloodSimulation;