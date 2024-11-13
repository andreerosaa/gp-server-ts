import mongoose, { Schema } from 'mongoose';

export const patientSchema = new Schema(
	{
		name: { type: String, required: true, unique: true },
		phoneNumber: { type: String, required: true, unique: true }
	},
	{
		timestamps: true
	}
);

export const Patient = mongoose.model('Patient', patientSchema);
