import mongoose, { Schema } from 'mongoose';

export const userSchema = new Schema(
	{
		username: { type: String, required: true, unique: true },
		password: { type: String, required: true, select: false }
	},
	{
		timestamps: true
	}
);

export const User = mongoose.model('User', userSchema);

export const getUsers = () => User.find();
export const getUserByUsername = (username: string) => User.findOne({ username });
export const getUserById = (id: string) => User.findById(id);
export const createUser = (values: Record<string, any>) => new User(values).save().then((user) => user.toObject());
export const deleteUserById = (id: string) => User.findByIdAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) => User.findByIdAndUpdate(id, values, { new: true });
