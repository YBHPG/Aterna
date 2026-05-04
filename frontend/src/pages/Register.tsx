import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface RegisterFormInputs {
    email: string;
    password: string;
}

const Register: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormInputs>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const onSubmit = async (data: RegisterFormInputs) => {
        try {
            const response = await api.post('/auth/register', data);
            // Ищем токен под разными возможными ключами
            const token = response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                login(token); // сразу авторизуем после успешной регистрации (если бэкенд возвращает токен)
                navigate('/dashboard');
            } else {
                navigate('/login'); // если токена нет, отправляем на страницу входа
            }
        } catch (error) {
            console.error('Ошибка при регистрации:', error);
            alert('Не удалось зарегистрироваться. Проверьте данные и попробуйте снова.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">Регистрация</h2>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                            {...register('email', { required: 'Введите email' })}
                        />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="password">Пароль</label>
                        <input
                            id="password"
                            type="password"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200"
                            {...register('password', { required: 'Введите пароль', minLength: { value: 6, message: 'Минимум 6 символов' } })}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                    </div>

                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-600 focus:outline-none focus:ring focus:ring-green-300">
                        Зарегистрироваться
                    </button>
                </form>
                <p className="mt-4 text-sm text-center text-gray-600">
                    Уже есть аккаунт? <Link to="/login" className="text-blue-500 hover:underline">Войти</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;