import { BaseModel } from './baseModel';

export interface IPatient extends BaseModel {
	name: string;
	email: string;
	verified: boolean;
	verificationCode: number;
	expirationCode: Date;
}

export interface IVerifyPatient {
	verificationCode: number;
}
export interface IGetPatientByEmail {
	email: string;
}

export interface IUpdatePatientName {
	name: string;
	email: string;
}
