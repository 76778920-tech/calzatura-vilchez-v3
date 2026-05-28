import {
  LOGIN_CURRENT_PASSWORD_AUTOCOMPLETE,
  LOGIN_PASSWORD_INPUT_TYPE,
} from "@/config/authCredentials";

const NO_BROWSER_AUTOCOMPLETE = "off" as const;
const INPUT_TYPE_TEXT = "text" as const;

export type LoginPageViewModel = {
  isAdminLogin: boolean;
  pageTitle: string;
  heading: string;
  subtitle: string;
  formAutoComplete: typeof NO_BROWSER_AUTOCOMPLETE | undefined;
  formDataType: "other" | undefined;
  emailAutoComplete: typeof NO_BROWSER_AUTOCOMPLETE | "email";
  passwordAutoComplete: typeof NO_BROWSER_AUTOCOMPLETE | typeof LOGIN_CURRENT_PASSWORD_AUTOCOMPLETE;
  passwordInputType: typeof INPUT_TYPE_TEXT | typeof LOGIN_PASSWORD_INPUT_TYPE;
  passwordToggleLabel: string;
  submitLabel: string;
  submitDisabled: boolean;
};

function passwordInputType(showPass: boolean) {
  return showPass ? INPUT_TYPE_TEXT : LOGIN_PASSWORD_INPUT_TYPE;
}

export function buildLoginPageViewModel(
  isAdminLogin: boolean,
  showPass: boolean,
  loading: boolean,
): LoginPageViewModel {
  const inputType = passwordInputType(showPass);
  const toggleLabel = showPass ? "Ocultar contraseña" : "Mostrar contraseña";
  const submitLabel = loading ? "Ingresando..." : "Iniciar Sesión";

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
      passwordInputType: inputType,
      passwordToggleLabel: toggleLabel,
      submitLabel,
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
    passwordAutoComplete: LOGIN_CURRENT_PASSWORD_AUTOCOMPLETE,
    passwordInputType: inputType,
    passwordToggleLabel: toggleLabel,
    submitLabel,
    submitDisabled: loading,
  };
}
