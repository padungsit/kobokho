function getDashboardData(token) {
  const auth = checkAuth(token);
  if (!auth.success) throw new Error("Unauthorized");
  
  const user = auth.user;
  
  // Admin & SuperAdmin dashboard view
  if (user.Role === 'SuperAdmin' || user.Role === 'Admin') {
    const users = getSheetData('USERS');
    const snapshots = getSheetData('SNAPSHOTS');
    
    // Count stats (exclude SuperAdmin from counts to focus on members)
    const totalUsers = users.filter(u => u.Role !== 'SuperAdmin').length;
    const activeUsers = users.filter(u => u.Role !== 'SuperAdmin' && u.Status === 'Active').length;
    const pendingUsers = users.filter(u => u.Role !== 'SuperAdmin' && u.Status === 'Inactive').length;
    const totalSnapshots = snapshots.length;
    
    // Get latest 5 registered users
    const recentMembers = [...users]
      .filter(u => u.Role !== 'SuperAdmin')
      .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
      .slice(0, 5);
      
    return {
      isAdmin: true,
      stats: {
        totalUsers: totalUsers,
        activeUsers: activeUsers,
        pendingUsers: pendingUsers,
        totalSnapshots: totalSnapshots
      },
      recentMembers: recentMembers.map(u => ({
        Username: u.Username,
        Name: u.Name,
        Role: u.Role,
        Status: u.Status,
        CreatedAt: u.CreatedAt
      }))
    };
  }
  
  // User dashboard view (own portfolio)
  const snapshots = getSheetData('SNAPSHOTS');
  let userSnaps = snapshots.filter(s => s.UserID === user.UserID);
  
  // Sort by date ASC
  userSnaps.sort((a, b) => new Date(a.Date) - new Date(b.Date));
  
  if (userSnaps.length === 0) {
    return { isAdmin: false, hasData: false };
  }
  
  // Calculate daily profit for snaps
  for (let i = 0; i < userSnaps.length; i++) {
    const cur = userSnaps[i];
    const prev = i > 0 ? userSnaps[i-1] : null;
    cur.DailyProfit = prev ? (parseFloat(cur.Profit) - parseFloat(prev.Profit)) : 0;
  }

  const latest = userSnaps[userSnaps.length - 1];
  const dailyProfit = latest.DailyProfit;
  const recentHistory = [...userSnaps].reverse().slice(0, 5);
  
  return {
    isAdmin: false,
    hasData: true,
    kpi: {
      totalAmount: latest.TotalAmount,
      totalPrincipal: latest.TotalPrincipal,
      totalBenefit: latest.TotalBenefit,
      profit: latest.Profit,
      yield: latest.Yield,
      lastUpdate: latest.Date,
      dailyProfit: dailyProfit
    },
    chartData: userSnaps.map(s => ({
      date: s.Date,
      totalAmount: s.TotalAmount,
      profit: s.Profit
    })),
    recentHistory: recentHistory.map(s => ({
      Date: s.Date,
      TotalAmount: s.TotalAmount,
      TotalPrincipal: s.TotalPrincipal,
      TotalBenefit: s.TotalBenefit,
      Yield: s.Yield,
      DailyProfit: s.DailyProfit
    }))
  };
}
