package com.wedding.api.repository;

import com.wedding.api.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    void deleteByInvitationId(String invitationId);
}
