"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LuEye, LuEyeClosed } from "react-icons/lu";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import {
    Card,
    CardTitle,
    CardHeader,
    CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const router = useRouter();

    const supabase = useMemo(() => createBrowserClient(), []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg("");

        if (!email.trim() || !password.trim()) {
            setErrorMsg("Please enter your email and password.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setErrorMsg(error.message || "Unable to log in.");
            return;
        }

        // Redirect after login
        router.push("/");
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-emerald-400 px-4">
            <Card className="w-full max-w-md bg-white">
                <CardHeader>
                    <CardTitle className="text-3xl text-center">
                        Streaming Murillo
                    </CardTitle>
                    <CardTitle className="text-2xl text-center">Log In</CardTitle>
                </CardHeader>

                <CardContent>
                    <form className="space-y-4" onSubmit={handleLogin}>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@streamingmurillo.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="password"
                                    type={showPass ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="*************"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={loading}
                                    onClick={() => setShowPass((v) => !v)}
                                    className="whitespace-nowrap cursor-pointer hover:bg-black hover:text-white duration-300"
                                >
                                    {showPass ? <LuEye /> : <LuEyeClosed />}
                                </Button>
                            </div>
                        </div>

                        {errorMsg && (
                            <p className="text-sm text-red-500">{errorMsg}</p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full border border-black cursor-pointer hover:bg-black hover:text-white duration-300"
                        >
                            {loading ? "Logging in..." : "Log In"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}