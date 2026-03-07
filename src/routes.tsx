import Editor from './pages/Editor';
import SamplePage from './pages/SamplePage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: '智能文档编辑器',
    path: '/',
    element: <Editor />
  },
  {
    name: 'Canvas 渲染测试',
    path: '/test',
    element: <SamplePage />
  }
];

export default routes;
