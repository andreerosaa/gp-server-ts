import Joi from 'joi';
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

export const getPatients = () => Patient.find();
export const getPatientByName = (name: string) => Patient.findOne({ name });
export const getPatientByEmail = (email: string) => Patient.findOne({ email });
export const getPatientById = (id: string) => Patient.findById(id);
export const createPatient = (values: Record<string, any>) => new Patient(values).save().then((patient) => patient.toObject());
export const deletePatientById = (id: string) => Patient.findByIdAndDelete({ _id: id });
export const updatePatientById = (id: string, values: Record<string, any>) => Patient.findByIdAndUpdate(id, values, { new: true });

export const patientValidation = Joi.object({
	name: Joi.string().required(),
	email: Joi.string().email().required(),
	verified: Joi.boolean().required(),
	verificationCode: Joi.string(),
	expirationCode: Joi.date()
});
