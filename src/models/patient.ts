import mongoose, { Schema } from 'mongoose';

export const patientSchema = new Schema(
	{
		name: { type: String, required: true },
		phoneNumber: { type: String, required: true, unique: true },
		verified: { type: Boolean, required: true },
		verificationCode: { type: Number },
		expirationCode: { type: Date }
	},
	{
		timestamps: true
	}
);

export const Patient = mongoose.model('Patient', patientSchema);
