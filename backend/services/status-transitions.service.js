const routeTransitions = {
  draft: ["draft", "planned"],
  planned: ["planned", "in_progress"],
  in_progress: ["in_progress", "completed"],
  completed: ["completed"],
};

const deliveryTransitions = {
  pending: ["pending", "planned", "in_progress"],
  planned: ["planned", "in_progress"],
  in_progress: ["in_progress", "completed", "rejected", "not_found"],
  completed: ["completed"],
  rejected: ["rejected"],
  not_found: ["not_found"],
};

export const canTransitionRoute = (currentStatus, nextStatus) =>
  routeTransitions[currentStatus]?.includes(nextStatus) || false;

export const canTransitionDelivery = (currentStatus, nextStatus) =>
  deliveryTransitions[currentStatus]?.includes(nextStatus) || false;