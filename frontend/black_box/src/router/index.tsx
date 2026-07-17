import {
    Suspense,
    lazy
} from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route
} from 'react-router-dom';
import Loading from '@/components/Loading';
import MainLayout from '@/layouts/MainLayout';
import RequireAuth from '@/components/RequireAuth';

// 二期已移除 react-activation/keep-alive(与 React 19 不兼容、insertBefore DOM 冲突致白屏)。
// 首页"返回保持"靠 store(useHomeStore),滚动靠 sessionStorage 恢复(见 Home.tsx)。
const Home = lazy(()=>import('@/pages/Home'))
const Mine = lazy(()=>import('@/pages/Mine'))
const Login = lazy(()=>import('@/pages/Login'))
const Chat = lazy(()=>import('@/pages/Chat'))
const PostDetail = lazy(()=>import('@/pages/post'))
const Search = lazy(()=>import('@/pages/Search'))
const Compose = lazy(()=>import('@/pages/Compose'))

export default function RouterConfig(
  {children}: {children?: React.ReactNode}
){

    return (
        <>
        <Router>
            <Suspense fallback={<Loading />}>
                <Routes>
                    {/* 登录页:独立全屏,不进 App Shell(auth 例外) */}
                    <Route path='/login' element={<Login />} />
                    {/* App Shell:所有业务页在此渲染 */}
                    <Route path='/' element={<MainLayout/>}>
                        {/* 公开页(现有展示页原样挂入) */}
                        <Route index element={<Home />} />
                        <Route path='search' element={<RequireAuth><Search /></RequireAuth>} />
                        <Route path='post/:id' element={<PostDetail />} />
                        {/* 受保护页:路由级守卫单一来源 */}
                        <Route path='chat' element={<RequireAuth><Chat /></RequireAuth>} />
                        <Route path='mine' element={<RequireAuth><Mine /></RequireAuth>} />
                        {/* 发帖页:二期已替换为真实表单 */}
                        <Route path='compose' element={<RequireAuth><Compose /></RequireAuth>} />
                    </Route>
                    {/* /rag、/git 路由已移除(整条不可达);组件/store/api 物理删除留三期 */}
                </Routes>
            </Suspense>
                {children}
        </Router>
        </>

    )
}
