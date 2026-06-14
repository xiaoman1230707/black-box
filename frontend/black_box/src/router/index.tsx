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
import { AliveScope } from 'react-activation';

const KeepAliveHome = lazy(()=>import('@/components/KeepAliveHome'))
const Mine = lazy(()=>import('@/pages/Mine'))
const Login = lazy(()=>import('@/pages/Login'))
const KeepAliveChat = lazy(()=>import('@/components/KeepAliveChat'))
const PostLayout = lazy(()=>import('@/layouts/PostLayout'))
const PostDetail = lazy(()=>import('@/pages/post'))
const Search = lazy(()=>import('@/pages/Search'))
const RAG = lazy(()=>import('@/pages/RAG'))
const Git = lazy(()=>import('@/pages/Git'))

export default function RouterConfig(
  {children}: {children?: React.ReactNode}
){
    
    return (
        <>
        <Router>
            <AliveScope>
                <Suspense fallback={<Loading />}>
                    <Routes>
                        <Route path='/login' element={<Login />} />
                        <Route path='/chat' element={<KeepAliveChat />} />
                        <Route path='/search' element={<Search />} />
                        <Route path='/rag' element={<RAG />} />
                        <Route path='/git' element={<Git />} />
                        {/* Post 模块 */}
                        <Route path='/post' element={<PostLayout />}>
                            <Route path=':id' element={<PostDetail />} />
                        </Route>
                        {/* 布局组件 */}
                        <Route path='/' element={<MainLayout/>}>
                            <Route path='' element={<KeepAliveHome />} />
                                <Route path='mine' element={<Mine />} />
                        </Route>
                    </Routes>
                </Suspense>
            </AliveScope>
                {children}
        </Router>
        </>
    
    )
}
