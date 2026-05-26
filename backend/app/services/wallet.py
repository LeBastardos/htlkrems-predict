class wallet:
  def __init__(self, user_id: int, amount: float):
    self.amount = 0.0
    self.user_id = user_id

def get_wallet_balance(user_id: int): 
  return {"user_id": user_id, "amount": user_id.amount}


def change_wallet_balance(user_id: int, amount: float):
  user_id.amount += amount

