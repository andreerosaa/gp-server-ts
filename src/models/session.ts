import mongoose, { Schema } from 'mongoose';

export const sessionSchema = new Schema(
	{
		// _id: { type: String, required: true, unique: true },
		date: { type: Date, required: true },
		therapistId: { type: String, required: true },
		patientId: { type: String, required: true },
		durationInMinutes: { type: Number, required: true },
		vacancies: { type: Number, required: true },
		confirmed: { type: Boolean, required: true }
	},
	{
		timestamps: true
	}
);

export const Session = mongoose.model('Session', sessionSchema);
