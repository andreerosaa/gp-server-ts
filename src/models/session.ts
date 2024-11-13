import mongoose, { Schema } from 'mongoose';

export const sessionSchema = new Schema(
	{
		date: { type: Date, required: true },
		therapistId: { type: String, required: true },
		patientId: { type: String },
		durationInMinutes: { type: Number, required: true },
		vacancies: { type: Number, required: true },
		status: { type: Number }
	},
	{
		timestamps: true
	}
);

export const Session = mongoose.model('Session', sessionSchema);
