import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "@/app/providers/ProtectedRoute";
import { RequiredSetupGate } from "@/app/providers/RequiredSetupGate";
import { RootLayout } from "@/widgets/layout/RootLayout";
import { OmicronLoader } from "@/shared/ui/loaders/OmicronLoader";

// 页面全部按需加载，避免把全站打进首屏 chunk。
// 页面用的是命名导出，这里统一转成 lazy 需要的 default 形态。
const lazyPage = <K extends string>(
  loader: () => Promise<Record<K, ComponentType>>,
  name: K,
) => lazy(() => loader().then((module) => ({ default: module[name] })));

const lazyPageWithProps = <P extends object, K extends string>(
  loader: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
) => lazy(() => loader().then((module) => ({ default: module[name] })));

const LoginPage = lazyPageWithProps<{ preview?: boolean }, "LoginPage">(
  () => import("@/pages/AuthPage/LoginPage"),
  "LoginPage",
);
const CallbackPage = lazyPage(
  () => import("@/pages/AuthPage/CallbackPage"),
  "CallbackPage",
);
const RequiredSetupPage = lazyPage(
  () => import("@/pages/AuthPage/RequiredSetupPage"),
  "RequiredSetupPage",
);
const SearchPage = lazyPage(() => import("@/pages/SearchPage"), "SearchPage");
const AISearchPage = lazyPage(
  () => import("@/pages/AISearchPage"),
  "AISearchPage",
);
const PlazaPage = lazyPage(() => import("@/pages/PlazaPage"), "PlazaPage");
const DrawPage = lazyPage(() => import("@/pages/DrawPage"), "DrawPage");
const TagsPage = lazyPage(() => import("@/pages/TagsPage"), "TagsPage");
const SettingsPage = lazyPage(
  () => import("@/pages/SettingsPage"),
  "SettingsPage",
);
const AboutPage = lazyPage(() => import("@/pages/AboutPage"), "AboutPage");
const MePage = lazyPage(() => import("@/pages/MePage"), "MePage");
const UserProfilePage = lazyPage(
  () => import("@/pages/UserProfilePage"),
  "UserProfilePage",
);
const ThreadDetailPage = lazyPage(
  () => import("@/pages/ThreadDetailPage"),
  "ThreadDetailPage",
);
const ActivityPage = lazyPage(
  () => import("@/pages/ActivityPage"),
  "ActivityPage",
);
const BooklistsPage = lazyPage(
  () => import("@/pages/BooklistsPage"),
  "BooklistsPage",
);
const BooklistDetailPage = lazyPage(
  () => import("@/pages/BooklistDetailPage"),
  "BooklistDetailPage",
);
const TournamentsPage = lazyPage(
  () => import("@/pages/TournamentsPage"),
  "TournamentsPage",
);
const MyTournamentsPage = lazyPage(
  () => import("@/pages/MyTournamentsPage"),
  "MyTournamentsPage",
);
const TournamentDetailPage = lazyPage(
  () => import("@/pages/TournamentDetailPage"),
  "TournamentDetailPage",
);
const TournamentManagePage = lazyPage(
  () => import("@/pages/TournamentManagePage"),
  "TournamentManagePage",
);
const NotFoundPage = lazyPage(
  () => import("@/pages/NotFoundPage"),
  "NotFoundPage",
);
// 调试页只在 DEV / mock 模式下注册路由；作为独立 chunk 存在，生产环境永远不会被下载
const TestPage = lazyPage(() => import("@/pages/TestPage"), "TestPage");

const isDevToolsEnabled =
  import.meta.env.DEV || import.meta.env.VITE_API_MOCKING === "true";

const PageFallback = () => (
  <div className="flex min-h-[60vh] w-full items-center justify-center">
    <OmicronLoader />
  </div>
);

const withSuspense = (node: ReactNode) => (
  <Suspense fallback={<PageFallback />}>{node}</Suspense>
);

const appChildren = [
  {
    index: true,
    element: withSuspense(<PlazaPage />),
  },
  {
    path: "search",
    element: withSuspense(<SearchPage />),
  },
  {
    path: "ai-search",
    element: withSuspense(<AISearchPage />),
  },
  {
    path: "tournaments",
    element: withSuspense(<TournamentsPage />),
  },
  {
    path: "tournaments/mine",
    element: withSuspense(<MyTournamentsPage />),
  },
  {
    path: "tournaments/manage/:booklistId",
    element: withSuspense(<TournamentManagePage />),
  },
  {
    path: "tournaments/:booklistId",
    element: withSuspense(<TournamentDetailPage />),
  },
  {
    path: "draw",
    element: withSuspense(<DrawPage />),
  },
  {
    path: "tags",
    element: withSuspense(<TagsPage />),
  },
  {
    path: "booklists",
    element: withSuspense(<BooklistsPage />),
  },
  {
    path: "booklists/:id",
    element: withSuspense(<BooklistDetailPage />),
  },
  {
    path: "settings",
    element: withSuspense(<SettingsPage />),
  },
  {
    path: "me",
    element: withSuspense(<MePage />),
  },
  {
    path: "activity",
    element: withSuspense(<ActivityPage />),
  },
  {
    path: "u/:userId",
    element: withSuspense(<UserProfilePage />),
  },
  {
    path: "threads/:threadId",
    element: withSuspense(<ThreadDetailPage />),
  },
  ...(isDevToolsEnabled
    ? [
        {
          path: "test",
          element: withSuspense(<TestPage />),
        },
      ]
    : []),
];

export const router = createBrowserRouter([
  {
    path: "/login",
    element: withSuspense(<LoginPage />),
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: "/test/login",
          element: withSuspense(<LoginPage preview />),
        },
      ]
    : []),
  {
    path: "/about",
    element: withSuspense(<AboutPage />),
  },
  {
    path: "/auth/callback",
    element: withSuspense(<CallbackPage />),
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "setup",
        element: withSuspense(<RequiredSetupPage />),
      },
      {
        element: <RequiredSetupGate />,
        children: [
          {
            element: <RootLayout />,
            children: [
              ...appChildren,
              {
                path: "*",
                element: withSuspense(<NotFoundPage />),
              },
            ],
          },
        ],
      },
    ],
  },
]);
