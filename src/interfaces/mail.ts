export enum EventTypes {
	USER_REGISTERED = 'userRegistered'
}

export interface UserRegisteredEventPayload {
	email: string;
	code: number;
}
