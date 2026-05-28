import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { LoginFormCard } from "@/domains/publico/components/LoginFormCard";
import { useLoginPage } from "@/domains/publico/hooks/useLoginPage";

type LoginProps = Readonly<{
  /** `admin`: sin autocompletado (equipos compartidos en tienda). `client`: comportamiento estándar. */
  variant?: "client" | "admin";
}>;

export default function Login({ variant = "client" }: LoginProps) {
  const {
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
  } = useLoginPage(variant);

  useDocumentTitle(viewModel.pageTitle);

  return (
    <main className="auth-page">
      <LoginFormCard
        viewModel={viewModel}
        email={email}
        password={password}
        showPass={showPass}
        fieldErrors={fieldErrors}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onTogglePassword={() => setShowPass((prev) => !prev)}
        onClearFieldError={clearFieldError}
        onForgotPassword={handleForgotPassword}
        onSubmit={handleLogin}
      />
    </main>
  );
}
