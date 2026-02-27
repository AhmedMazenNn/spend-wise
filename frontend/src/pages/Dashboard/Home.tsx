import { getStoredUser } from "../../api/auth"
import { Sidebar } from "../../components/Sidebar"

const Home = () => {
  const user = getStoredUser()
  
  return (
    <div>
      <Sidebar/>

      <main className="ml-64 p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome, {user?.name}</p>
      </main>
    </div>
  )
}

export default Home