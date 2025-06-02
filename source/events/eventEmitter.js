import { Listener } from "./listener.js";

export const EventEmitter = function() {
    this.listeners = new Map();
}

EventEmitter.prototype.listen = function(eventType) {
    if(this.listeners.has(eventType)) {
        return;
    }

    const listener = new Listener(eventType);
    this.listeners.set(eventType, listener);
}

EventEmitter.prototype.subscribe = function(eventType, subscriberID, callback) {
    if(!this.listeners.has(eventType)) {
        return;
    }

    const listener = this.listeners.get(eventType);
    listener.observers.push({"subscriber": subscriberID, "callback": callback});
}

EventEmitter.prototype.emit = function(eventType, ...args) {
    if(!this.listeners.has(eventType)) {
        return;
    }

    const listener = this.listeners.get(eventType);

    for(const { subscriber, callback } of listener.observers) {
        callback(...args);
    }
}

EventEmitter.prototype.deafen = function(eventType) {
    if(!this.listeners.has(eventType)) {
        return;
    }

    const listener = this.listeners.get(eventType);
    listener.observers = [];
}

EventEmitter.prototype.unsubscribe = function(eventType, subscriberID) {
    if(!this.listeners.has(eventType)) {
        return;
    }

    const listener = this.listeners.get(eventType);
    const remainingObservers = listener.observers.filter(observer => observer.subscriber !== subscriberID);
    listener.observers = remainingObservers;
}

EventEmitter.prototype.unsubscribeAll = function(subscriberID) {
    for(const [id, listener] of this.listeners) {
        const remainingObservers = listener.observers.filter(observer => observer.subscriber !== subscriberID);
        listener.observers = remainingObservers;
    }
}

EventEmitter.prototype.deafenAll = function() {
    for(const [id, listener] of this.listeners) {
        listener.observers = [];
    }
}