import EventEmitter from 'events';

export class EventBus extends EventEmitter {}

const eventBus = new EventBus();

export default eventBus;
