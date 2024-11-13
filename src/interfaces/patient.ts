import { BaseModel } from './baseModel';

export interface IPatient extends BaseModel {
	name: string;
	phoneNumber: string;
	verified: boolean;
	verificationCode: number;
	expirationCode: Date;
	createdAt: Date;
	updatedAt: Date;
}
