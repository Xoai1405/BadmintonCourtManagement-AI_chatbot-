package com.smashflow.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.smashflow.backend.model.User;
import com.smashflow.backend.model.enums.Role;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByEmail(String email);

    boolean existsByPhoneNumber(String phoneNumber);

    Optional<User> findByEmailOrPhoneNumber(String email, String phoneNumber);

    // Nhân viên tìm khách khi tạo booking tại quầy (tham số rỗng = bỏ qua điều kiện đó)
    @Query("""
            select u from User u
            where u.role = :role
              and lower(u.fullName) like lower(concat('%', :name, '%'))
              and u.phoneNumber like concat('%', :phone, '%')
              and lower(u.email) like lower(concat('%', :email, '%'))
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
}
