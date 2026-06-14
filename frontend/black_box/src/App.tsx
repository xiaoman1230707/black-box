import '@/App.css'
import {useUserStore} from "@/store/useUserStore"
import {useEffect} from 'react';
import { useNavigate ,useLocation} from 'react-router-dom';
import BackToTop from '@/components/BackToTop';

export const needsLogin = ['/mine','/order','/chat']


function App() {
  const {isLogin} = useUserStore();
  const navigate = useNavigate();
  const {pathname} = useLocation();
  useEffect(()=>{
    if(!isLogin && needsLogin.includes(pathname)){
      navigate('/login');
    }
  },[isLogin,pathname])
  return (
    <>
    <BackToTop />
    </>
  )
}

export default App
