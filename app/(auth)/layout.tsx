import React from "react";

type Props = {
    children: React.ReactNode;
};

const AuthLayout = ({ children }: Props) => {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            {children}
        </div>
    );
};

export default AuthLayout;
