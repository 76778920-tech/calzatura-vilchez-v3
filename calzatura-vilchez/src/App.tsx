import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/domains/carrito/context/CartContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { ADMIN_ROUTES, CLIENT_ROUTES, INFO_ROUTES, PUBLIC_ROUTES } from "./routes/paths";
import { AreaRoute, AuthenticatedRoute, PageLoader } from "./routes/RouteGuards";
import { useAuth } from "@/domains/usuarios/context/AuthContext";

// Carga diferida por dominio. El control real de acceso está en AreaRoute,
// AdminLayout y reglas de Firestore, no en ocultar archivos del frontend.
const AdminLayout = lazy(() => import("@/domains/administradores/components/AdminLayout"));
const AdminDashboard = lazy(() => import("@/domains/administradores/pages/AdminDashboard"));
const AdminProducts = lazy(() => import("@/domains/productos/pages/AdminProducts"));
const AdminOrders = lazy(() => import("@/domains/pedidos/pages/AdminOrders"));
const AdminSales = lazy(() => import("@/domains/ventas/pages/AdminSales"));
const AdminUsers = lazy(() => import("@/domains/usuarios/pages/AdminUsers"));
const AdminManufacturers = lazy(() => import("@/domains/fabricantes/pages/AdminManufacturers"));
const AdminPredictions = lazy(() => import("@/domains/administradores/pages/AdminPredictions"));
const AdminData = lazy(() => import("@/domains/administradores/pages/AdminData"));

const HomePage = lazy(() => import("@/domains/publico/pages/HomePage"));
const ProductsPage = lazy(() => import("@/domains/productos/pages/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/domains/productos/pages/ProductDetailPage"));
const CartPage = lazy(() => import("@/domains/carrito/pages/CartPage"));
const CheckoutPage = lazy(() => import("@/domains/carrito/pages/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("@/domains/pedidos/pages/OrderSuccessPage"));
const OrderHistoryPage = lazy(() => import("@/domains/pedidos/pages/OrderHistoryPage"));
const ProfilePage = lazy(() => import("@/domains/usuarios/pages/ProfilePage"));
const StoresPage = lazy(() => import("@/domains/publico/pages/StoresPage"));
const FavoritesPage = lazy(() => import("@/domains/clientes/pages/FavoritesPage"));
const Login = lazy(() => import("@/domains/publico/pages/Login"));
const Register = lazy(() => import("@/domains/publico/pages/Register"));
const VerifyEmail = lazy(() => import("@/domains/publico/pages/VerifyEmail"));
const Logo3DPage = lazy(() => import("@/domains/publico/pages/Logo3DPage"));
const InfoPage = lazy(() => import("@/domains/publico/pages/InfoPage"));
const ThesisIsoPage = lazy(() => import("@/domains/publico/pages/ThesisIsoPage"));

function Storefront() {
  const { loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <div className="app-shell">
      <Header />
      <div className="app-content">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path={PUBLIC_ROUTES.home} element={<HomePage />} />
            <Route path={PUBLIC_ROUTES.products} element={<ProductsPage />} />
            <Route path={PUBLIC_ROUTES.productDetail} element={<ProductDetailPage />} />
            <Route path={PUBLIC_ROUTES.stores} element={<StoresPage />} />
            <Route path={PUBLIC_ROUTES.cart} element={<CartPage />} />
            <Route path={PUBLIC_ROUTES.login} element={<Login />} />
            <Route path={PUBLIC_ROUTES.register} element={<Register />} />
            <Route path={PUBLIC_ROUTES.verifyEmail} element={<VerifyEmail />} />
            <Route path="/logo-3d-preview" element={<Logo3DPage />} />
            <Route path={INFO_ROUTES.corporativoQuienesSomos} element={<InfoPage pageKey="quienesSomos" />} />
            <Route path={INFO_ROUTES.corporativoNuestraHistoria} element={<InfoPage pageKey="nuestraHistoria" />} />
            <Route path={INFO_ROUTES.corporativoMundoVilchez} element={<InfoPage pageKey="mundoVilchez" />} />
            <Route path={INFO_ROUTES.tesisIso25001} element={<ThesisIsoPage />} />
            <Route path={INFO_ROUTES.legalTerminos} element={<InfoPage pageKey="terminos" />} />
            <Route path={INFO_ROUTES.legalPrivacidad} element={<InfoPage pageKey="privacidad" />} />
            <Route path={INFO_ROUTES.legalLibroReclamaciones} element={<InfoPage pageKey="libroReclamaciones" />} />
            <Route path={INFO_ROUTES.ayudaContacto} element={<InfoPage pageKey="contactanos" />} />
            <Route path={INFO_ROUTES.ayudaRastreoPedido} element={<InfoPage pageKey="rastreoPedido" />} />
            <Route path={INFO_ROUTES.ayudaPreguntasFrecuentes} element={<InfoPage pageKey="preguntasFrecuentes" />} />
            <Route path={INFO_ROUTES.ayudaCambios} element={<InfoPage pageKey="cambios" />} />
            <Route path={INFO_ROUTES.beneficiosClubVilchez} element={<InfoPage pageKey="clubVilchez" />} />
            <Route path={INFO_ROUTES.beneficiosCuotas} element={<InfoPage pageKey="cuotas" />} />

            <Route
              path={CLIENT_ROUTES.checkout}
              element={<AuthenticatedRoute><CheckoutPage /></AuthenticatedRoute>}
            />
            <Route
              path={CLIENT_ROUTES.orderSuccess}
              element={<AuthenticatedRoute><OrderSuccessPage /></AuthenticatedRoute>}
            />
            <Route
              path={CLIENT_ROUTES.orderHistory}
              element={<AreaRoute area="pedidos"><OrderHistoryPage /></AreaRoute>}
            />
            <Route
              path={CLIENT_ROUTES.profile}
              element={<AreaRoute area="clientes"><ProfilePage /></AreaRoute>}
            />
            <Route
              path={CLIENT_ROUTES.favorites}
              element={<AreaRoute area="clientes"><FavoritesPage /></AreaRoute>}
            />

            <Route path="*" element={<Navigate to={PUBLIC_ROUTES.home} replace />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: "var(--font-sans)", fontSize: "14px" },
          }}
        />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route
              path={ADMIN_ROUTES.root}
              element={<AreaRoute area="administradores"><AdminLayout /></AreaRoute>}
            >
              <Route index element={<AdminDashboard />} />
              <Route path="productos" element={<AdminProducts />} />
              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="ventas" element={<AdminSales />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="fabricantes" element={<AdminManufacturers />} />
              <Route path="predicciones" element={<AdminPredictions />} />
              <Route path="datos" element={<AdminData />} />
            </Route>
            <Route path="/*" element={<Storefront />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </CartProvider>
  );
}
