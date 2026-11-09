package com.smashflow.backend.modules.identity.user.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.smashflow.backend.modules.identity.user.model.User;
import com.smashflow.backend.modules.identity.user.model.enums.Role;

public interface UserRepository extends JpaRepository<User, Long> {
  boolean existsByEmail(String email);

  boolean existsByPhoneNumber(String phoneNumber);

  Optional<User> findByEmailOrPhoneNumber(String email, String phoneNumber);

  // Nhân viên tìm khách khi tạo booking tại quầy (tham số rỗng = bỏ qua điều kiện
  // đó)
  @Query("""
      select u from User u
      where u.role = :role
        and lower(u.fullName) like lower(concat('%', :name, '%'))
        and u.phoneNumber like concat('%', :phone, '%')
        and lower(u.email) like lower(concat('%', :email, '%'))
        and u.emailVerified = true
      order by u.fullName asc
      """)
  List<User> searchCustomers(
      @Param("role") Role role,
      @Param("name") String name,
      @Param("phone") String phone,
      @Param("email") String email,
      Pageable pageable);

  List<User> findByRoleOrderByIdDesc(Role role);

  Optional<User> findByEmail(String email);

  Optional<User> findByPhoneNumber(String phoneNumber);

  // Xoa tai khoan khong duoc xac thuc sau 7 ngay
  @Modifying
  @Query("""
      delete from User u
      where u.emailVerified = false
        and u.createdAt < :cutoff
        and not exists (select b from Booking b where b.customer = u)
        and not exists (select r from RecurringBooking r where r.customer = u)
      """)
  int deleteUnverifiedCreatedBefore(@Param("cutoff") LocalDateTime cutoff);
}
