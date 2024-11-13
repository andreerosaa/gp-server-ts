import mongoose, { Schema } from 'mongoose';

export const patientSchema = new Schema(
	{
		name: { type: String, required: true },
		email: {
			type: String,
			required: true,
			unique: true,
			match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please fill a valid email address']
		},
		verified: { type: Boolean, required: true },
		verificationCode: { type: Number },
		expirationCode: { type: Date }
	},
	{
		timestamps: true
	}
);

export const Patient = mongoose.model('Patient', patientSchema);
