#!/usr/bin/python3

import json
import time
import random
import threading
from datetime import datetime
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from flask_cors import CORS

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all domains
socketio = SocketIO(app, cors_allowed_origins="*")

# Sample data structure - we'll simulate IoT sensor data
sensors = {
    "sensors": [
        {
            "id": "temp-001",
            "name": "Temperature Sensor 1",
            "type": "temperature",
            "unit": "celsius",
            "value": 22.5,
            "status": "online",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "hum-001",
            "name": "Humidity Sensor 1",
            "type": "humidity",
            "unit": "percent",
            "value": 45.2,
            "status": "online",
            "last_updated": datetime.now().isoformat()
        },
        {
            "id": "pres-001",
            "name": "Pressure Sensor 1",
            "type": "pressure",
            "unit": "hPa",
            "value": 1013.25,
            "status": "online",
            "last_updated": datetime.now().isoformat()
        }
    ]
}

# Function to update sensor data randomly
def update_sensor_data():
    for sensor in sensors["sensors"]:
        # Generate random fluctuation based on sensor type
        if sensor["type"] == "temperature":
            fluctuation = random.uniform(-0.5, 0.5)
            if 15 <= sensor["value"] + fluctuation <= 30:
                sensor["value"] = round(sensor["value"] + fluctuation, 2)
        elif sensor["type"] == "humidity":
            fluctuation = random.uniform(-1.0, 1.0)
            if 30 <= sensor["value"] + fluctuation <= 70:
                sensor["value"] = round(sensor["value"] + fluctuation, 2)
        elif sensor["type"] == "pressure":
            fluctuation = random.uniform(-0.25, 0.25)
            if 990 <= sensor["value"] + fluctuation <= 1030:
                sensor["value"] = round(sensor["value"] + fluctuation, 2)
        
        # Update timestamp
        sensor["last_updated"] = datetime.now().isoformat()
    
    return sensors

# Background task for periodic updates
def background_update():
    while True:
        updated_data = update_sensor_data()
        socketio.emit('sensor_update', updated_data)
        time.sleep(.01)  # Update every 5 seconds

# REST API Routes
@app.route('/api/sensors', methods=['GET'])
def get_all_sensors():
    return jsonify(sensors)

@app.route('/api/sensors/<sensor_id>', methods=['GET'])
def get_sensor(sensor_id):
    for sensor in sensors["sensors"]:
        if sensor["id"] == sensor_id:
            return jsonify(sensor)
    return jsonify({"error": "Sensor not found"}), 404

@app.route('/api/sensors/type/<sensor_type>', methods=['GET'])
def get_sensors_by_type(sensor_type):
    matching_sensors = [sensor for sensor in sensors["sensors"] if sensor["type"] == sensor_type]
    if matching_sensors:
        return jsonify({"sensors": matching_sensors})
    return jsonify({"error": f"No sensors of type {sensor_type} found"}), 404

# Socket.IO events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('sensor_update', sensors)  # Send initial data on connect

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

# Start the background task when the server starts
@socketio.on('start_background')
def start_background_task():
    thread = threading.Thread(target=background_update)
    thread.daemon = True
    thread.start()

if __name__ == '__main__':
    # Start the background update task
    thread = threading.Thread(target=background_update)
    thread.daemon = True
    thread.start()
    
    # Run the Flask app with SocketIO
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
