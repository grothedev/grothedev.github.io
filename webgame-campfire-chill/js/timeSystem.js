class TimeSystem {
    constructor() {
        this.gameStartTime = Date.now();
        this.realTimePerGameDay = 60 * 60 * 1000; // 1 hour in milliseconds
        this.gameTimeSpeed = 24; // 24 game hours per real hour
        this.currentGameDay = 1;
        this.listeners = new Map();
        this.dailyActions = new Map(); // Track actions that can only be done once per day
        this.maxDailyMovement = 1000; // Maximum movement distance per day
        this.playerDailyMovement = 0;
        
        this.setupTimeEvents();
    }

    setupTimeEvents() {
        // Update time every minute
        setInterval(() => {
            this.checkTimeEvents();
        }, 60000);
        
        // Reset daily counters at midnight game time
        this.onTimeEvent('00:00', () => {
            this.resetDailyActions();
        });
    }

    getCurrentGameTime() {
        const realTimePassed = Date.now() - this.gameStartTime;
        const gameTimePassed = realTimePassed * this.gameTimeSpeed;
        
        const gameTimeInDay = gameTimePassed % (24 * 60 * 60 * 1000);
        const hours = Math.floor(gameTimeInDay / (60 * 60 * 1000));
        const minutes = Math.floor((gameTimeInDay % (60 * 60 * 1000)) / (60 * 1000));
        
        return {
            hours: hours,
            minutes: minutes,
            day: Math.floor(realTimePassed / this.realTimePerGameDay) + 1,
            timeString: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        };
    }

    getTimeOfDay() {
        const time = this.getCurrentGameTime();
        const hour = time.hours;
        
        if (hour >= 6 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    canPerformDailyAction(actionType) {
        const currentDay = this.getCurrentGameTime().day;
        const lastPerformed = this.dailyActions.get(actionType);
        
        return !lastPerformed || lastPerformed < currentDay;
    }

    performDailyAction(actionType) {
        if (!this.canPerformDailyAction(actionType)) {
            return false;
        }
        
        const currentDay = this.getCurrentGameTime().day;
        this.dailyActions.set(actionType, currentDay);
        return true;
    }

    canMove(distance) {
        return this.playerDailyMovement + distance <= this.maxDailyMovement;
    }

    recordMovement(distance) {
        if (this.canMove(distance)) {
            this.playerDailyMovement += distance;
            return true;
        }
        return false;
    }

    getRemainingMovement() {
        return Math.max(0, this.maxDailyMovement - this.playerDailyMovement);
    }

    resetDailyActions() {
        this.playerDailyMovement = 0;
        console.log('New game day started! Daily actions reset.');
        
        // Notify listeners of new day
        this.triggerEvent('new_day', this.getCurrentGameTime());
    }

    onTimeEvent(timeString, callback) {
        if (!this.listeners.has(timeString)) {
            this.listeners.set(timeString, []);
        }
        this.listeners.get(timeString).push(callback);
    }

    onEvent(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    checkTimeEvents() {
        const currentTime = this.getCurrentGameTime();
        const timeString = currentTime.timeString;
        
        // Check for time-specific events
        if (this.listeners.has(timeString)) {
            this.listeners.get(timeString).forEach(callback => callback(currentTime));
        }
        
        // Check for time-of-day events
        const timeOfDay = this.getTimeOfDay();
        this.triggerEvent(`time_${timeOfDay}`, currentTime);
    }

    triggerEvent(eventType, data) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(callback => callback(data));
        }
    }

    getActivityDuration(activityType) {
        const durations = {
            'build_house': 4 * 60 * 60 * 1000, // 4 hours
            'farm': 2 * 60 * 60 * 1000, // 2 hours
            'fish': 1 * 60 * 60 * 1000, // 1 hour
            'travel': 30 * 60 * 1000, // 30 minutes
            'dance': 10 * 60 * 1000, // 10 minutes
            'play_instrument': 15 * 60 * 1000 // 15 minutes
        };
        
        return durations[activityType] || 0;
    }
}

export default TimeSystem;