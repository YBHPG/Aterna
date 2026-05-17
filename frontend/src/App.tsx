import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import { Dashboard } from "./components/Dashboard";
import ViewMessage from "./pages/ViewMessage";
import Profile from "./pages/Profile";
import { Toaster } from "react-hot-toast";
import ConfirmEmail from "./pages/ConfirmEmail";

function App() {
    return (
        <>
            <style>{`
                :root {
                    --rgb-bg-main: 231, 203, 177;
                    --color-bg-main: rgb(var(--rgb-bg-main));

                    --rgb-bg-card: 254, 235, 220;
                    --color-bg-card: rgb(var(--rgb-bg-card));

                    --rgb-bg-msg: 253, 243, 232;
                    --color-bg-msg: rgb(var(--rgb-bg-msg));

                    --rgb-text-main: 15, 5, 0;
                    --color-text-main: rgb(var(--rgb-text-main));

                    --rgb-border: 45, 25, 15;
                    --color-border: rgb(var(--rgb-border));

                    --rgb-accent: 55, 25, 5;
                    --color-accent: rgb(var(--rgb-accent));

                    --rgb-danger: 200, 0, 0;
                    --color-danger: rgb(var(--rgb-danger));

                    --rgb-danger-hover: 160, 0, 0;
                    --color-danger-hover: rgb(var(--rgb-danger-hover));

                    --rgb-profile-bg: 15, 5, 0;
                    --color-profile-bg: rgb(var(--rgb-profile-bg));

                    --rgb-profile-text: 255, 245, 235;
                    --color-profile-text: rgb(var(--rgb-profile-text));

                    --rgb-dropdown-bg: 255, 245, 235;
                    --color-dropdown-bg: rgb(var(--rgb-dropdown-bg));

                    --rgb-error: 200, 0, 0;
                    --color-error: rgb(var(--rgb-error));

                    --rgb-error-hover: 160, 0, 0;
                    --color-error-hover: rgb(var(--rgb-error-hover));

                    --rgb-beige-btn: 215, 170, 140;
                    --color-beige-btn: rgb(var(--rgb-beige-btn));

                    --rgb-beige-btn-hover: 195, 145, 115;
                    --color-beige-btn-hover: rgb(var(--rgb-beige-btn-hover));

                    --rgb-calendar-hover: 220, 30, 30;
                    --color-calendar-hover: rgb(var(--rgb-calendar-hover));

                    --logo-filter: none;
                    --icon-filter: none;
                    --icon-filter-active: invert(1) brightness(2);
                }

                @media (prefers-color-scheme: dark) {
                    :root {
                        --rgb-bg-main: 25, 12, 5;
                        --rgb-bg-card: 40, 20, 10;
                        --rgb-bg-msg: 35, 18, 8;
                        --rgb-text-main: 255, 245, 235;
                        --rgb-border: 190, 150, 120;
                        --rgb-accent: 255, 210, 175;
                        --rgb-danger: 255, 80, 80;
                        --rgb-danger-hover: 220, 50, 50;
                        --rgb-profile-bg: 255, 245, 235;
                        --rgb-profile-text: 15, 5, 0;
                        --rgb-dropdown-bg: 50, 25, 12;
                        --rgb-error: 255, 80, 80;
                        --rgb-error-hover: 220, 50, 50;
                        --rgb-beige-btn: 110, 60, 25;
                        --rgb-beige-btn-hover: 140, 80, 35;
                        --rgb-calendar-hover: 255, 120, 120;

                        --logo-filter: invert(1) hue-rotate(180deg);
                        --icon-filter: invert(1) hue-rotate(180deg);
                        --icon-filter-active: none;
                    }
                }

                body {
                    transition: background-color 0.3s ease, color 0.3s ease;
                }
            `}</style>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/confirm-email" element={<ConfirmEmail />} />
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
            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        backgroundColor: "var(--color-bg-card)",
                        color: "var(--color-text-main)",
                        fontFamily: "Cormorant, serif",
                        fontSize: "18px",
                        fontWeight: 400,
                        borderRadius: "22px",
                        border: "2px solid rgba(var(--rgb-border), 0.2)",
                        boxShadow:
                            "0px 10px 25px -5px rgba(0, 0, 0, 0.3), 0px 8px 10px -6px rgba(0, 0, 0, 0.1)",
                    },
                    success: {
                        iconTheme: {
                            primary: "var(--color-accent)",
                            secondary: "var(--color-bg-card)",
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: "var(--color-error)",
                            secondary: "var(--color-bg-card)",
                        },
                    },
                }}
            />
        </>
    );
}

export default App;
