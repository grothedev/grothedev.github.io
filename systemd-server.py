#!/usr/bin/env python3

import json
import subprocess
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse
import os

class SystemdStatusHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/api/systemd-status':
            self.handle_systemd_status()
        elif parsed_path.path == '/':
            self.serve_html_file('systemd-status.html')
        elif parsed_path.path.endswith('.html'):
            self.serve_html_file(parsed_path.path[1:])  # Remove leading slash
        else:
            self.send_error(404, "File not found")
    
    def handle_systemd_status(self):
        try:
            services = self.get_systemd_services()
            self.send_json_response(services)
        except Exception as e:
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def get_systemd_services(self):
        # Get list of all service units
        result = subprocess.run([
            'systemctl', 'list-units', '--type=service', '--all', '--no-pager', '--plain'
        ], capture_output=True, text=True, check=True)
        
        services = []
        lines = result.stdout.strip().split('\n')[1:]  # Skip header
        
        for line in lines:
            if not line.strip() or 'LOAD' in line:  # Skip empty lines and headers
                continue
                
            parts = line.split()
            if len(parts) < 4:
                continue
                
            service_name = parts[0]
            load_state = parts[1]
            active_state = parts[2] 
            sub_state = parts[3]
            
            # Get additional details for this service
            service_info = self.get_service_details(service_name)
            
            services.append({
                'name': service_name,
                'status': active_state,
                'loadState': load_state,
                'subState': sub_state,
                'activeSince': service_info.get('activeSince'),
                'memory': service_info.get('memory'),
                'pid': service_info.get('pid'),
                'description': service_info.get('description')
            })
        
        # Sort by status (active first) then by name
        services.sort(key=lambda x: (x['status'] != 'active', x['name']))
        
        return services
    
    def get_service_details(self, service_name):
        try:
            # Get detailed service information
            result = subprocess.run([
                'systemctl', 'show', service_name, '--no-pager'
            ], capture_output=True, text=True, check=True)
            
            info = {}
            for line in result.stdout.split('\n'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    info[key] = value
            
            # Extract relevant information
            details = {}
            
            # Active since
            if 'ActiveEnterTimestamp' in info and info['ActiveEnterTimestamp']:
                details['activeSince'] = info['ActiveEnterTimestamp']
            
            # Memory usage
            if 'MemoryCurrent' in info and info['MemoryCurrent'] and info['MemoryCurrent'] != '[not set]':
                memory_bytes = int(info['MemoryCurrent'])
                if memory_bytes > 0:
                    if memory_bytes > 1024 * 1024:
                        details['memory'] = f"{memory_bytes / (1024 * 1024):.1f} MB"
                    else:
                        details['memory'] = f"{memory_bytes / 1024:.1f} KB"
            
            # Main PID
            if 'MainPID' in info and info['MainPID'] and info['MainPID'] != '0':
                details['pid'] = info['MainPID']
            
            # Description
            if 'Description' in info and info['Description']:
                details['description'] = info['Description']
            
            return details
            
        except subprocess.CalledProcessError:
            return {}
    
    def serve_html_file(self, filename):
        try:
            with open(filename, 'r') as f:
                content = f.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(content.encode())
        except FileNotFoundError:
            self.send_error(404, "File not found")
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())
    
    def log_message(self, format, *args):
        # Override to customize logging
        print(f"[{self.address_string()}] {format % args}")

def main():
    port = int(os.environ.get('PORT', 8080))
    server = HTTPServer(('', port), SystemdStatusHandler)
    
    print(f"Starting systemd status server on port {port}")
    print(f"Open http://localhost:{port} to view the status page")
    print("Press Ctrl+C to stop the server")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        server.shutdown()

if __name__ == '__main__':
    main()