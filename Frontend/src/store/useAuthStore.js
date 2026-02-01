import axios from "axios";
import { create } from "zustand";
import { axiosInstance } from "../lib/axios";



export const useAuthStore =  create((set) => ({
    authUser: null,
    isSigningUp: false,
    isLoggingIng: false,
    isUpdatingProfile: false,

    isCheckingAuth: true,
    isCheckingAuth: true,

    checkAuth: async() => {
        try {
              const res = await axiosInstance.get("/auth/check");
        } catch (error) {

        }
    }

}));