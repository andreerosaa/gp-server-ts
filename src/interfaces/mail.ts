export enum EventTypes {
	USER_REGISTERED = 'userRegistered',
	NEW_VERIFICATION_CODE = 'newVerificationCode'
}

export interface UserRegisteredEventPayload {
	email: string;
	code: number;
}
