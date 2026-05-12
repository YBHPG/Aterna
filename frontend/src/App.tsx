import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { CreateMessage } from "./components/CreateMessage";
import { Dashboard } from "./components/Dashboard";
import ViewMessage from "./pages/ViewMessage";
import Profile from "./pages/Profile";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<CreateMessage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/messages/:id"
                    element={
                        <ProtectedRoute>
                            <ViewMessage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
