const NO_BROWSER_AUTOCOMPLETE = "off" as const;

export type LoginPageViewModel = {
  isAdminLogin: boolean;
  pageTitle: string;
  heading: string;
  subtitle: string;
  formAutoComplete: typeof NO_BROWSER_AUTOCOMPLETE | undefined;
  formDataType: "other" | undefined;
  emailAutoComplete: typeof NO_BROWSER_AUTOCOMPLETE | "email";
  passwordAutoComplete: typeof NO_BROWSER_AUTOCOMPLETE | "current-password";
  passwordInputType: "text" | "password";
  passwordToggleLabel: string;
  submitLabel: string;
  submitDisabled: boolean;
};

export function buildLoginPageViewModel(
  isAdminLogin: boolean,
  showPass: boolean,
  loading: boolean,
): LoginPageViewModel {
  if (isAdminLogin) {
    return {
      isAdminLogin: true,
      pageTitle: "Acceso administrativo",
      heading: "Panel administrativo",
      subtitle: "Acceso solo para personal autorizado",
      formAutoComplete: NO_BROWSER_AUTOCOMPLETE,
      formDataType: "other",
      emailAutoComplete: NO_BROWSER_AUTOCOMPLETE,
      passwordAutoComplete: NO_BROWSER_AUTOCOMPLETE,
      passwordInputType: showPass ? "text" : "password",
      passwordToggleLabel: showPass ? "Ocultar contraseña" : "Mostrar contraseña",
      submitLabel: loading ? "Ingresando..." : "Iniciar Sesión",
      submitDisabled: loading,
    };
  }

  return {
    isAdminLogin: false,
    pageTitle: "Iniciar sesión",
    heading: "Iniciar Sesión",
    subtitle: "Bienvenido de vuelta",
    formAutoComplete: undefined,
    formDataType: undefined,
    emailAutoComplete: "email",
    passwordAutoComplete: "current-password",
    passwordInputType: showPass ? "text" : "password",
    passwordToggleLabel: showPass ? "Ocultar contraseña" : "Mostrar contraseña",
    submitLabel: loading ? "Ingresando..." : "Iniciar Sesión",
    submitDisabled: loading,
  };
}
