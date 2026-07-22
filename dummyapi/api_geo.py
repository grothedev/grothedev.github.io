import json
import time
import random
import threading
import copy
import math
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import os

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all domains
socketio = SocketIO(app, cors_allowed_origins="*")

# Path to the data configuration file
CONFIG_FILE = 'data_config_geo.json'

# Global data store
data_store = {}
config = {}

def load_config():
    """Load configuration from JSON file"""
    global data_store, config
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config_data = json.load(f)
            
        # Set global configuration
        config = config_data.get('config', {})
        
        # Initialize data store from collections
        for collection in config_data.get('collections', []):
            collection_name = collection.get('name')
            if collection_name:
                # Add timestamp to each item
                for item in collection.get('items', []):
                    item['last_updated'] = datetime.now().isoformat()
                
                # Store collection in data_store
                data_store[collection_name] = {
                    'type': collection.get('type', 'standard'),
                    'items': collection.get('items', [])
                }
        
        print(f"Loaded configuration with {len(data_store)} collections")
        return True
    except Exception as e:
        print(f"Error loading configuration: {str(e)}")
        return False

def get_formatted_value(value, precision=None):
    """Format a value according to its type and precision"""
    if isinstance(value, float) and precision is not None:
        return round(value, precision)
    return value

def get_nested_value(obj, path):
    """Get a nested value from an object using a dot-separated path"""
    parts = path.split('.')
    current = obj
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        elif isinstance(current, list) and part.isdigit() and int(part) < len(current):
            current = current[int(part)]
        else:
            return None
    return current

def set_nested_value(obj, path, value):
    """Set a nested value in an object using a dot-separated path"""
    parts = path.split('.')
    current = obj
    
    # Navigate to the parent of the target property
    for i, part in enumerate(parts[:-1]):
        if part not in current:
            # If the next part is a number, create a list
            if parts[i + 1].isdigit():
                current[part] = []
            else:
                current[part] = {}
                
        if isinstance(current[part], dict):
            current = current[part]
        elif isinstance(current[part], list):
            next_idx = int(parts[i + 1])
            while len(current[part]) <= next_idx:
                current[part].append({})
            current = current[part][next_idx]
    
    # Set the value
    current[parts[-1]] = value

def update_geojson_point(coordinates, update_rule):
    """Update a GeoJSON Point geometry based on movement rules"""
    # Extract update rule parameters
    speed_knots = update_rule.get('speed_knots', 10)
    heading_variation = update_rule.get('heading_variation', 10)
    speed_variation = update_rule.get('speed_variation', 1)
    bounds = update_rule.get('bounds', [-180, -90, 180, 90])
    
    # Calculate random variations for this update
    speed = speed_knots + random.uniform(-speed_variation, speed_variation)
    heading = random.uniform(-heading_variation, heading_variation)
    
    # Convert speed from knots to degrees per update interval (approximate)
    # 1 knot ≈ 0.0003 degrees of longitude per 5 seconds at the equator
    # This is a very simplified calculation and doesn't account for latitude
    update_interval = config.get('update_interval', 5)
    speed_deg = speed * 0.0003 * (update_interval / 5)
    
    # Current coordinates
    lon, lat = coordinates
    
    # Calculate new position
    # Note: This is a simplified calculation that doesn't account for the
    # curvature of the Earth properly, but works for small movements
    angle_rad = math.radians(heading)
    new_lon = lon + speed_deg * math.sin(angle_rad)
    new_lat = lat + speed_deg * math.cos(angle_rad)
    
    # Ensure the new position is within bounds
    min_lon, min_lat, max_lon, max_lat = bounds
    new_lon = max(min_lon, min(max_lon, new_lon))
    new_lat = max(min_lat, min(max_lat, new_lat))
    
    return [new_lon, new_lat]

def generate_random_incident():
    """Generate a random traffic incident"""
    incident_types = ["accident", "construction", "event", "closure"]
    severities = ["minor", "moderate", "major"]
    
    incident_type = random.choice(incident_types)
    severity = random.choice(severities)
    
    descriptions = {
        "accident": ["Vehicle collision", "Multi-car accident", "Traffic accident", "Minor fender bender"],
        "construction": ["Road work", "Lane closure", "Utility work", "Bridge maintenance"],
        "event": ["Parade", "Sports event", "Festival", "Demonstration"],
        "closure": ["Road closed", "Bridge closed", "Exit closed", "On-ramp closed"]
    }
    
    return {
        "type": incident_type,
        "description": random.choice(descriptions.get(incident_type, ["Incident"])),
        "severity": severity,
        "reported": datetime.now().isoformat()
    }

def update_data():
    """Update all data items according to their update rules"""
    global data_store
    
    for collection_name, collection in data_store.items():
        collection_type = collection.get('type', 'standard')
        
        for item in collection['items']:
            # Skip items without update rules
            if 'update_rules' not in item:
                continue
                
            # For GeoJSON items, we may need to handle nested properties
            if collection_type == 'geojson':
                # Apply update rules for fields
                for field_path, rules in item['update_rules'].items():
                    rule_type = rules.get('type')
                    
                    # Special handling for geo_movement rule type
                    if rule_type == 'geo_movement':
                        if field_path == 'geometry.coordinates' and item['geometry']['type'] == 'Point':
                            current_coords = item['geometry']['coordinates']
                            new_coords = update_geojson_point(current_coords, rules)
                            item['geometry']['coordinates'] = new_coords
                    
                    # Special handling for random_incidents rule type
                    elif rule_type == 'random_incidents':
                        if field_path == 'properties.incidents':
                            # Check if we should add a new incident
                            if random.random() < rules.get('probability', 0.1):
                                current_incidents = get_nested_value(item, field_path) or []
                                max_incidents = rules.get('max_incidents', 1)
                                
                                # Remove old incidents randomly to keep under max
                                while len(current_incidents) >= max_incidents:
                                    current_incidents.pop(random.randint(0, len(current_incidents) - 1))
                                
                                # Add new incident
                                current_incidents.append(generate_random_incident())
                                set_nested_value(item, field_path, current_incidents)
                    
                    # Handle standard rule types for nested properties
                    else:
                        current_value = get_nested_value(item, field_path)
                        if current_value is not None:
                            if rule_type == 'random_float':
                                min_change = rules.get('min_change', -1.0)
                                max_change = rules.get('max_change', 1.0)
                                min_value = rules.get('min_value', float('-inf'))
                                max_value = rules.get('max_value', float('inf'))
                                precision = rules.get('precision', 2)
                                
                                change = random.uniform(min_change, max_change)
                                new_value = current_value + change
                                
                                # Apply constraints
                                new_value = max(min_value, min(max_value, new_value))
                                set_nested_value(item, field_path, get_formatted_value(new_value, precision))
                            
                            elif rule_type == 'random_int':
                                min_change = rules.get('min_change', -1)
                                max_change = rules.get('max_change', 1)
                                min_value = rules.get('min_value', 0)
                                max_value = rules.get('max_value', 100)
                                
                                change = random.randint(min_change, max_change)
                                new_value = current_value + change
                                
                                # Apply constraints
                                new_value = max(min_value, min(max_value, new_value))
                                set_nested_value(item, field_path, int(new_value))
                            
                            elif rule_type == 'random_choice':
                                choices = rules.get('choices', [])
                                if choices:
                                    set_nested_value(item, field_path, random.choice(choices))
            else:
                # Standard (non-geojson) item update
                # Apply update rules for each field
                for field, rules in item['update_rules'].items():
                    if field not in item:
                        continue
                        
                    rule_type = rules.get('type')
                    
                    if rule_type == 'random_float':
                        min_change = rules.get('min_change', -1.0)
                        max_change = rules.get('max_change', 1.0)
                        min_value = rules.get('min_value', float('-inf'))
                        max_value = rules.get('max_value', float('inf'))
                        precision = rules.get('precision', 2)
                        
                        change = random.uniform(min_change, max_change)
                        new_value = item[field] + change
                        
                        # Apply constraints
                        new_value = max(min_value, min(max_value, new_value))
                        item[field] = get_formatted_value(new_value, precision)
                    
                    elif rule_type == 'random_int':
                        min_change = rules.get('min_change', -1)
                        max_change = rules.get('max_change', 1)
                        min_value = rules.get('min_value', 0)
                        max_value = rules.get('max_value', 100)
                        
                        change = random.randint(min_change, max_change)
                        new_value = item[field] + change
                        
                        # Apply constraints
                        new_value = max(min_value, min(max_value, new_value))
                        item[field] = int(new_value)
                    
                    elif rule_type == 'random_choice':
                        choices = rules.get('choices', [])
                        if choices:
                            item[field] = random.choice(choices)
            
            # Update timestamp
            if collection_type == 'geojson' and 'properties' in item:
                item['properties']['last_updated'] = datetime.now().isoformat()
            else:
                item['last_updated'] = datetime.now().isoformat()
    
    return copy.deepcopy(data_store)

# Background task for periodic updates
def background_update():
    update_interval = config.get('update_interval', 5)  # Default update interval is 5 seconds
    while True:
        updated_data = update_data()
        socketio.emit('data_update', updated_data)
        time.sleep(update_interval)

# Serve static files (for the dashboard)
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# REST API Routes
@app.route('/api/collections', methods=['GET'])
def get_collections():
    """Get a list of all available collections"""
    collection_info = {name: {'type': collection.get('type', 'standard')} 
                      for name, collection in data_store.items()}
    return jsonify({'collections': collection_info})

@app.route('/api/collections/<collection_name>', methods=['GET'])
def get_collection(collection_name):
    """Get all items in a specific collection"""
    if collection_name in data_store:
        return jsonify(data_store[collection_name])
    return jsonify({"error": f"Collection '{collection_name}' not found"}), 404

@app.route('/api/collections/<collection_name>/<item_id>', methods=['GET'])
def get_item(collection_name, item_id):
    """Get a specific item by its ID within a collection"""
    if collection_name in data_store:
        for item in data_store[collection_name]['items']:
            if item.get('id') == item_id:
                return jsonify(item)
        return jsonify({"error": f"Item with ID '{item_id}' not found"}), 404
    return jsonify({"error": f"Collection '{collection_name}' not found"}), 404

@app.route('/api/collections/<collection_name>/type/<type_value>', methods=['GET'])
def get_items_by_type(collection_name, type_value):
    """Get all items of a specific type within a collection"""
    if collection_name in data_store:
        collection_type = data_store[collection_name].get('type', 'standard')
        
        # For GeoJSON collections, look for the type in properties
        if collection_type == 'geojson':
            matching_items = [item for item in data_store[collection_name]['items'] 
                             if item.get('properties', {}).get('type') == type_value]
        else:
            matching_items = [item for item in data_store[collection_name]['items'] 
                             if item.get('type') == type_value]
        
        if matching_items:
            return jsonify({"items": matching_items})
        return jsonify({"error": f"No items of type '{type_value}' found"}), 404
    return jsonify({"error": f"Collection '{collection_name}' not found"}), 404

@app.route('/api/geojson/<collection_name>', methods=['GET'])
def get_geojson_collection(collection_name):
    """Get a collection as a GeoJSON FeatureCollection"""
    if collection_name in data_store and data_store[collection_name].get('type') == 'geojson':
        # Create a proper GeoJSON FeatureCollection
        feature_collection = {
            "type": "FeatureCollection",
            "features": data_store[collection_name]['items']
        }
        return jsonify(feature_collection)
    return jsonify({"error": f"GeoJSON collection '{collection_name}' not found"}), 404

@app.route('/api/schema', methods=['GET'])
def get_schema():
    """Get the current data schema"""
    schema = {
        "collections": []
    }
    
    for collection_name, collection in data_store.items():
        schema_collection = {
            "name": collection_name, 
            "type": collection.get('type', 'standard'),
            "items": []
        }
        
        # Add sample item structure from first item (if available)
        if collection['items']:
            if collection.get('type') == 'geojson':
                schema_item = {
                    "type": "Feature",
                    "geometry": {
                        "type": collection['items'][0]['geometry']['type'],
                        "coordinates": "..."
                    },
                    "properties": {
                        key: type(value).__name__ 
                        for key, value in collection['items'][0]['properties'].items()
                        if key != 'update_rules'
                    }
                }
            else:
                schema_item = {
                    key: type(value).__name__ 
                    for key, value in collection['items'][0].items() 
                    if key != 'update_rules'
                }
            
            schema_collection["items"].append(schema_item)
        
        schema["collections"].append(schema_collection)
    
    return jsonify(schema)

# Socket.IO events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('data_update', data_store)  # Send initial data on connect

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('start_background')
def start_background_task():
    thread = threading.Thread(target=background_update)
    thread.daemon = True
    thread.start()

if __name__ == '__main__':
    if load_config():
        # Start the background update task
        thread = threading.Thread(target=background_update)
        thread.daemon = True
        thread.start()
        
        # Run the Flask app with SocketIO
        socketio.run(app, host='0.0.0.0', port=5000, debug=True)
    else:
        print(f"Failed to load configuration from {CONFIG_FILE}")