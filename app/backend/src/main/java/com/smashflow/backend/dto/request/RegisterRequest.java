package com.smashflow.backend.dto.request;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record RegisterRequest(
    @NotBlank (message = "Họ tên không được để trống.")
    String fullName,

    @NotBlank (message = "Email không được để trống.")
    @Email 
    String email,

    @NotBlank (message = "SDT không được để trống.")
    String phoneNumber,

    @NotBlank (message= "Mật khẩu không được để trống.")
    @Size( min =8, message = "Mật khẩu tối thiểu 8 kí tự.")
    String password

) {
    

}
