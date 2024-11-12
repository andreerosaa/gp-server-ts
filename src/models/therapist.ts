import mongoose, { Schema } from 'mongoose';

export const therapistSchema = new Schema(
	{
		name: { type: String, required: true, unique: true }
	},
	{
		timestamps: true
	}
);

export const Therapist = mongoose.model('Therapist', therapistSchema);
