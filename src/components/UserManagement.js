import React, { useEffect, useState } from "react";
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";

const UserManagement = ({ onAddUser }) => {
  const { t } = useTranslation();

  const [users, setUsers] = useState([]);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 20;

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const u = doc.data() || {};
        return {
          id: doc.id,
          name: u.name || "",
          email: u.email || "",
          createdAt: u.createdAt || null,
          status: u.status || "active",
          totalScore: u.totalScore || 0,
          completedQuizzes: u.completedQuizzes || 0,
          ...u,
        };
      });
      // Ordenar por data de criação (mais recentes primeiro)
      data.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.seconds - a.createdAt.seconds;
      });
      setUsers(data);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (window.confirm(t("confirm_delete_user"))) {
      await deleteDoc(doc(db, "users", id));
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateDoc(doc(db, "users", id), { status: newStatus });
  };

  const filteredUsers = users.filter((u) => {
    const matchesName = nameFilter === "" || 
      u.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
      u.email.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesStatus = statusFilter === "" || u.status === statusFilter;
    return matchesName && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const currentUsers = filteredUsers.slice(
    startIndex,
    startIndex + usersPerPage
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-yellow-400">
            {t("users_tab")}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {t("total_users")}: {users.length}
          </p>
        </div>
        <button
          onClick={onAddUser}
          className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-lg">+</span>
          <span>{t("add_user")}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64">
          <input
            type="text"
            placeholder={t("search_users")}
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
        <div className="min-w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">{t("all_status")}</option>
            <option value="active">{t("active")}</option>
            <option value="inactive">{t("inactive")}</option>
          </select>
        </div>
        <button
          onClick={() => {
            setNameFilter("");
            setStatusFilter("");
          }}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          {t("clear_filters")}
        </button>
      </div>

      {/* Tabela de usuários */}
      <div className="overflow-x-auto">
        <table className="w-full bg-gray-800 rounded-lg overflow-hidden">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("name")}
              </th>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("email")}
              </th>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("created_at")}
              </th>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("status")}
              </th>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("score")}
              </th>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("quizzes")}
              </th>
              <th className="px-4 py-3 text-left text-yellow-400 font-semibold">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-gray-400">
                  {t("no_users_found")}
                </td>
              </tr>
            ) : (
              currentUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 text-white font-medium">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-green-900 text-green-300"
                          : "bg-red-900 text-red-300"
                      }`}
                    >
                      {t(user.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {user.totalScore}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {user.completedQuizzes}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleStatusToggle(user.id, user.status)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          user.status === "active"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        }`}
                      >
                        {user.status === "active" ? t("deactivate") : t("activate")}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-400">
            {t("showing")} {startIndex + 1}-{Math.min(startIndex + usersPerPage, filteredUsers.length)} {t("of")} {filteredUsers.length}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
            >
              {t("previous")}
            </button>
            <span className="px-3 py-1 bg-gray-800 text-white rounded">
              {t("page")} {currentPage} {t("of")} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-colors"
            >
              {t("next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
