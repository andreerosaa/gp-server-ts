import { BaseModel } from './baseModel';

export interface IPatient extends BaseModel {
	name: string;
	email: string;
	verified: boolean;
	verificationCode: number;
	expirationCode: Date;
}
