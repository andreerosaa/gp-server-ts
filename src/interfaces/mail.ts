import { ISession } from './session';

export enum EventTypes {
	USER_REGISTERED = 'userRegistered',
	NEW_VERIFICATION_CODE = 'newVerificationCode',
	SESSION_BOOKED = 'sessionBooked'
}

export interface UserRegisteredEventPayload {
	email: string;
	code: number;
}
export interface SessionBookedEventPayload {
	session: ISession;
	email: string;
}
