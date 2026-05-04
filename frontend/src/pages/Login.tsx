import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface LoginFormInputs {
    email: string;
    password: string;
}

const Login: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
    const navigate = useNavigate();
    const { login } = useAuth();

    const onSubmit = async (data: LoginFormInputs) => {
        try {
            const response = await api.post('/auth/login', data);
            // Ищем токен под разными возможными ключами
            const token = response.data.token || response.data.access_token || response.data.accessToken;
            if (token) {
                login(token); // сохраняет токен в localStorage и обновляет контекст (подзадача 15.4)
                navigate('/dashboard'); // перенаправление после успешной авторизации
            }
        } catch (error) {
            console.error('Ошибка при входе:', error);
            alert('Не удалось войти в систему. Проверьте данные и попробуйте снова.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
                <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">Вход в систему</h2>
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
                            {...register('password', { required: 'Введите пароль' })}
                        />
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                    </div>

                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300">
                        Войти
                    </button>
                </form>
                <p className="mt-4 text-sm text-center text-gray-600">
                    Нет аккаунта? <Link to="/register" className="text-blue-500 hover:underline">Зарегистрироваться</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;