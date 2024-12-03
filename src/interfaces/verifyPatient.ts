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
