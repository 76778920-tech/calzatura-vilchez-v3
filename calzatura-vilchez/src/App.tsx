import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "@/domains/carrito/context/CartContext";
import { FavoritesProvider } from "@/domains/clientes/context/FavoritesContext";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    globalThis.scrollTo(0, 0);
    const main = document.getElementById("main-content");
    if (main) main.focus({ preventScroll: true });
  }, [pathname]);
  return null;
}
import { CookieBanner } from "@/components/cookies/CookieBanner";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import { CookieConsentProvider } from "@/context/CookieConsentContext";
import { ADMIN_ROUTES, CLIENT_ROUTES, INFO_ROUTES, PUBLIC_ROUTES, STAFF_ROUTES } from "./routes/paths";
import { CATALOG_SHELF } from "./routes/catalogRouting";
import { AreaRoute, AuthenticatedRoute, PageLoader } from "./routes/RouteGuards";

// Carga diferida por dominio. El control real de acceso está en AreaRoute,
// AdminLayout y datos de perfil (Supabase `usuarios` + Firebase Auth), no en ocultar archivos del bundle.
const AdminLayout = lazy(() => import("@/domains/administradores/components/AdminLayout"));
const AdminDashboard = lazy(() => import("@/domains/administradores/pages/AdminDashboard"));
const AdminProducts = lazy(() => import("@/domains/productos/pages/AdminProducts"));
const AdminOrders = lazy(() => import("@/domains/pedidos/pages/AdminOrders"));
const AdminSales = lazy(() => import("@/domains/ventas/pages/AdminSales"));
const StaffSales = lazy(() => import("@/domains/trabajadores/pages/StaffSales"));
const AdminUsers = lazy(() => import("@/domains/usuarios/pages/AdminUsers"));
const AdminManufacturers = lazy(() => import("@/domains/fabricantes/pages/AdminManufacturers"));
const AdminPredictions = lazy(() => import("@/domains/administradores/pages/AdminPredictions"));
const AdminData = lazy(() => import("@/domains/administradores/pages/AdminData"));
const AdminComplaints = lazy(() => import("@/domains/administradores/pages/AdminComplaints"));

const StaffLayout = lazy(() => import("@/domains/trabajadores/components/StaffLayout"));
const StaffHomePage = lazy(() => import("@/domains/trabajadores/pages/StaffHomePage"));

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
const InfoPage = lazy(() => import("@/domains/publico/pages/InfoPage"));
const ThesisIsoPage = lazy(() => import("@/domains/publico/pages/ThesisIsoPage"));
const CyberWowLandingPage = lazy(() => import("@/domains/publico/pages/CyberWowLandingPage"));
const ClubCalzadoLandingPage = lazy(() => import("@/domains/publico/pages/ClubCalzadoLandingPage"));
const NotFoundPage = lazy(() => import("@/domains/publico/pages/NotFoundPage"));

function Storefront() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Saltar al contenido principal
      </a>
      <Header />
      <div className="app-content" id="main-content" tabIndex={-1}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path={PUBLIC_ROUTES.home} element={<HomePage />} />
            <Route path={CATALOG_SHELF.cyberLanding} element={<CyberWowLandingPage />} />
            <Route path={CATALOG_SHELF.clubCalzadoLanding} element={<ClubCalzadoLandingPage />} />
            <Route path={`${CATALOG_SHELF.products}/:categoria/:facetSlug`} element={<ProductsPage />} />
            <Route path={`${CATALOG_SHELF.products}/:categoria`} element={<ProductsPage />} />
            <Route path={CATALOG_SHELF.products} element={<ProductsPage />} />
            <Route path={`${CATALOG_SHELF.outlet}/:categoria/:facetSlug`} element={<ProductsPage />} />
            <Route path={`${CATALOG_SHELF.outlet}/:categoria`} element={<ProductsPage />} />
            <Route path={CATALOG_SHELF.outlet} element={<ProductsPage />} />
            <Route path={`${CATALOG_SHELF.nuevaTemporada}/:categoria/:facetSlug`} element={<ProductsPage />} />
            <Route path={`${CATALOG_SHELF.nuevaTemporada}/:categoria`} element={<ProductsPage />} />
            <Route path={CATALOG_SHELF.nuevaTemporada} element={<ProductsPage />} />
            <Route path={PUBLIC_ROUTES.productDetail} element={<ProductDetailPage />} />
            <Route path={PUBLIC_ROUTES.stores} element={<StoresPage />} />
            <Route path={PUBLIC_ROUTES.cart} element={<CartPage />} />
            <Route path={PUBLIC_ROUTES.login} element={<Login />} />
            <Route path={PUBLIC_ROUTES.register} element={<Register />} />
            <Route path={PUBLIC_ROUTES.verifyEmail} element={<VerifyEmail />} />
            <Route path={INFO_ROUTES.corporativoQuienesSomos} element={<InfoPage pageKey="quienesSomos" />} />
            <Route path={INFO_ROUTES.corporativoNuestraHistoria} element={<InfoPage pageKey="nuestraHistoria" />} />
            <Route path={INFO_ROUTES.corporativoMundoVilchez} element={<InfoPage pageKey="mundoVilchez" />} />
            <Route path={INFO_ROUTES.tesisIso25001} element={<ThesisIsoPage />} />
            <Route path={INFO_ROUTES.legalTerminos} element={<InfoPage pageKey="terminos" />} />
            <Route path={INFO_ROUTES.legalPrivacidad} element={<InfoPage pageKey="privacidad" />} />
            <Route path={INFO_ROUTES.legalCookies} element={<InfoPage pageKey="politicaCookies" />} />
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

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CookieConsentProvider>
      <ScrollToTop />
      <CookieBanner />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontFamily: "var(--font-sans)", fontSize: "14px" },
        }}
      />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path={ADMIN_ROUTES.login} element={<Login variant="admin" />} />
          <Route
            path={STAFF_ROUTES.root}
            element={<AreaRoute area="trabajadores"><StaffLayout /></AreaRoute>}
          >
            <Route index element={<StaffHomePage />} />
            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="ventas" element={<StaffSales />} />
            <Route path="libro-reclamaciones" element={<AdminComplaints />} />
          </Route>
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
            <Route path="libro-reclamaciones" element={<AdminComplaints />} />
          </Route>
          <Route path="/*" element={
            <CartProvider>
              <FavoritesProvider>
                <Storefront />
              </FavoritesProvider>
            </CartProvider>
          } />
        </Routes>
      </Suspense>
      </CookieConsentProvider>
    </BrowserRouter>
  );
}
