import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuth } from './context/AuthContext';
import { CreateMessage } from './components/CreateMessage';


function Home() {
  return <div>Home Page</div>;
}

function Dashboard() {
  const { logout } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard Page</h1>
      <button onClick={logout} className="px-4 py-2 mt-4 text-white bg-red-500 rounded hover:bg-red-600">
        Выйти
      </button>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/create" element={
          <ProtectedRoute><CreateMessage /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;