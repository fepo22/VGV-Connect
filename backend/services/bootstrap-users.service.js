import bcrypt from "bcryptjs";
import prisma from "../prismaClient.js";

const DEMO_USERS = [
  ["admin", "Administrador", "admin", "admin123"],
  ["programador", "Programador", "route_planner", "programador123"],
  ["faturacion", "Yessica", "billing", "faturacion123"],
  ["nalvarez", "Nicolas Alvarez", "driver", "nalvarez123"],
  ["acampos", "Alejandro Campos", "driver", "acampos123"],
  ["msolis", "Mauricio Solis", "driver", "msolis123"],
  ["rtito", "Roberto Saavedra", "driver", "rtito123"],
  ["lseal", "Luis Seal", "driver", "lseal123"],
  ["ltorres", "Luis Torres", "driver", "ltorres123"],
  ["Tsantos", "Tolentino Santos", "driver", "tsantos123"],
];

let bootstrapChecked = false;

export const ensureDemoUsers = async () => {
  if (bootstrapChecked) return;
  bootstrapChecked = true;

  try {
    if (process.env.ENABLE_DEMO_USERS === "false") return;

    const totalUsers = await prisma.user.count();
    if (totalUsers > 0) return;

    for (const [username, name, role, password] of DEMO_USERS) {
      await prisma.user.create({
        data: {
          username,
          name,
          role,
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
    }

    console.log("Usuarios demo inicializados porque la base estaba vacia");
  } catch (error) {
    bootstrapChecked = false;
    throw error;
  }
};
