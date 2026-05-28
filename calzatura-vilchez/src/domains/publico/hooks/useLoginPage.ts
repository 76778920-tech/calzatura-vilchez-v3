import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  requestPasswordReset,
  showLoginFailure,
  submitLogin,
  validateLoginFields,
  type LoginFieldErrors,
} from "@/domains/publico/utils/loginPageFlow";
import { buildLoginPageViewModel } from "@/domains/publico/utils/loginPageViewModel";

export function useLoginPage(variant: "client" | "admin") {
  const isAdminLogin = variant === "admin";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>({});

  const viewModel = useMemo(
    () => buildLoginPageViewModel(isAdminLogin, showPass, loading),
    [isAdminLogin, showPass, loading],
  );

  const clearFieldError = (field: keyof LoginFieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleForgotPassword = async () => {
    setFieldErrors(await requestPasswordReset(email));
  };

  const handleLogin = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    const errors = validateLoginFields(email, password);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await submitLogin(email, password, searchParams.get("redirect"), navigate);
    } catch (err) {
      showLoginFailure(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    viewModel,
    email,
    setEmail,
    password,
    setPassword,
    showPass,
    setShowPass,
    fieldErrors,
    clearFieldError,
    handleForgotPassword,
    handleLogin,
  };
}
