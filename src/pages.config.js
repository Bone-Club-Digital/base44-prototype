import Academy from './pages/Academy';
import Admin from './pages/Admin';
import AdminAvatars from './pages/AdminAvatars';
import AdminBadges from './pages/AdminBadges';
import AdminCategories from './pages/AdminCategories';
import AdminHomeBanners from './pages/AdminHomeBanners';
import AdminMedia from './pages/AdminMedia';
import AdminOrders from './pages/AdminOrders';
import AdminPlans from './pages/AdminPlans';
import AdminProducts from './pages/AdminProducts';
import AdminTournaments from './pages/AdminTournaments';
import AdminUsers from './pages/AdminUsers';
import Checkout from './pages/Checkout';
import ClubDetails from './pages/ClubDetails';
import ClubHouse from './pages/ClubHouse';
import ClubSettings from './pages/ClubSettings';
import Clubs from './pages/Clubs';
import Friends from './pages/Friends';
import Game from './pages/Game';
import Home from './pages/Home';
import LeagueDetails from './pages/LeagueDetails';
import ManageBones from './pages/ManageBones';
import ManageClubHouse from './pages/ManageClubHouse';
import ManageEvents from './pages/ManageEvents';
import ManageMembers from './pages/ManageMembers';
import ManageTournament from './pages/ManageTournament';
import MemberDirectory from './pages/MemberDirectory';
import Membership from './pages/Membership';
import Messages from './pages/Messages';
import MyGames from './pages/MyGames';
import MyOrders from './pages/MyOrders';
import MyPositions from './pages/MyPositions';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import RedeemBones from './pages/RedeemBones';
import SharedGameSnapshot from './pages/SharedGameSnapshot';
import Shop from './pages/Shop';
import Topic from './pages/Topic';
import TournamentBracket from './pages/TournamentBracket';
import TournamentDetails from './pages/TournamentDetails';
import Tournaments from './pages/Tournaments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Academy": Academy,
    "Admin": Admin,
    "AdminAvatars": AdminAvatars,
    "AdminBadges": AdminBadges,
    "AdminCategories": AdminCategories,
    "AdminHomeBanners": AdminHomeBanners,
    "AdminMedia": AdminMedia,
    "AdminOrders": AdminOrders,
    "AdminPlans": AdminPlans,
    "AdminProducts": AdminProducts,
    "AdminTournaments": AdminTournaments,
    "AdminUsers": AdminUsers,
    "Checkout": Checkout,
    "ClubDetails": ClubDetails,
    "ClubHouse": ClubHouse,
    "ClubSettings": ClubSettings,
    "Clubs": Clubs,
    "Friends": Friends,
    "Game": Game,
    "Home": Home,
    "LeagueDetails": LeagueDetails,
    "ManageBones": ManageBones,
    "ManageClubHouse": ManageClubHouse,
    "ManageEvents": ManageEvents,
    "ManageMembers": ManageMembers,
    "ManageTournament": ManageTournament,
    "MemberDirectory": MemberDirectory,
    "Membership": Membership,
    "Messages": Messages,
    "MyGames": MyGames,
    "MyOrders": MyOrders,
    "MyPositions": MyPositions,
    "Profile": Profile,
    "PublicProfile": PublicProfile,
    "RedeemBones": RedeemBones,
    "SharedGameSnapshot": SharedGameSnapshot,
    "Shop": Shop,
    "Topic": Topic,
    "TournamentBracket": TournamentBracket,
    "TournamentDetails": TournamentDetails,
    "Tournaments": Tournaments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};