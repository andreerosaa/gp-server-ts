// import crypto from 'crypto';
// import { auth } from '../config/config';
import bcrypt from 'bcryptjs';

// export const random = () => crypto.randomBytes(128).toString('base64');
// export const authentication = (salt: string, password: string) => {
// 	return crypto.createHmac('sha256', [salt, password].join('/')).update(auth.JWT_SECRET);
// };

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const comparePasswords = (inputPassword: string, userPassword: string) => bcrypt.compare(inputPassword, userPassword);
