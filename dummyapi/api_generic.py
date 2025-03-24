#!/usr/bin/python

import json
import time
import random
import threading
import copy
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
CONFIG_FILE = 'data_config.json'

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

def update_data():
    """Update all data items according to their update rules"""
    global data_store
    
    for collection_name, collection in data_store.items():
        for item in collection['items']:
            # Skip items without update rules
            if 'update_rules' not in item:
                continue
                
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
    return send_from_directory('.', 'index_generic.html')

# REST API Routes
@app.route('/api/', methods=['GET'])
def get_collections():
    """Get a list of all available collections"""
    return jsonify({'collections': list(data_store.keys())})

@app.route('/api/<collection_name>', methods=['GET'])
def get_collection(collection_name):
    """Get all items in a specific collection"""
    if collection_name in data_store:
        return jsonify(data_store[collection_name])
    return jsonify({"error": f"Collection '{collection_name}' not found"}), 404

@app.route('/api/<collection_name>/<item_id>', methods=['GET'])
def get_item(collection_name, item_id):
    """Get a specific item by its ID within a collection"""
    if collection_name in data_store:
        for item in data_store[collection_name]['items']:
            if item.get('id') == item_id:
                return jsonify(item)
        return jsonify({"error": f"Item with ID '{item_id}' not found"}), 404
    return jsonify({"error": f"Collection '{collection_name}' not found"}), 404

@app.route('/api/<collection_name>/type/<type_value>', methods=['GET'])
def get_items_by_type(collection_name, type_value):
    """Get all items of a specific type within a collection"""
    if collection_name in data_store:
        matching_items = [item for item in data_store[collection_name]['items'] 
                         if item.get('type') == type_value]
        if matching_items:
            return jsonify({"items": matching_items})
        return jsonify({"error": f"No items of type '{type_value}' found"}), 404
    return jsonify({"error": f"Collection '{collection_name}' not found"}), 404

@app.route('/api/schema', methods=['GET'])
def get_schema():
    """Get the current data schema"""
    schema = {
        "collections": []
    }
    
    for collection_name, collection in data_store.items():
        schema_collection = {"name": collection_name, "items": []}
        
        # Add sample item structure from first item (if available)
        if collection['items']:
            sample_item = collection['items'][0]
            schema_item = {key: type(value).__name__ for key, value in sample_item.items() 
                          if key != 'update_rules'}
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
