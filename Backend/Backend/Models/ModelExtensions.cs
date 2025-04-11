using Backend.Models;
using CineNiche.API.Data;
using CineNiche.API.DTOs;

namespace Backend.Models
{
    public static class ModelExtensions
    {
        // Convert MovieUser to User
        public static User ToUser(this MovieUser movieUser)
        {
            if (movieUser == null) return null;
            
            return new User
            {
                Id = movieUser.user_id,
                Email = movieUser.email,
                Username = movieUser.name,
                Phone = movieUser.phone,
                Age = movieUser.age,
                Gender = movieUser.gender,
                City = movieUser.city,
                State = movieUser.state,
                StytchUserId = movieUser.StytchUserId ?? string.Empty,
                PasswordHash = movieUser.PasswordHash ?? movieUser.password ?? string.Empty,
                PasswordSalt = movieUser.PasswordSalt ?? string.Empty,
                // Other properties would need to be set appropriately
                CreatedAt = DateTime.UtcNow
            };
        }
        
        // Convert User to MovieUser
        public static MovieUser ToMovieUser(this User user)
        {
            if (user == null) return null;
            
            return new MovieUser
            {
                user_id = user.Id,
                email = user.Email,
                name = user.Username,
                phone = user.Phone ?? string.Empty,
                age = user.Age ?? 0,
                gender = user.Gender ?? string.Empty,
                city = user.City ?? string.Empty,
                state = user.State ?? string.Empty,
                StytchUserId = user.StytchUserId,
                password = user.PasswordHash ?? string.Empty, // Keep for backward compatibility
                PasswordHash = user.PasswordHash ?? string.Empty,
                PasswordSalt = user.PasswordSalt ?? string.Empty,
                isAdmin = 0 // Default to regular user
            };
        }
        
        // Convert User to UserInfoDto
        public static UserInfoDto ToUserInfoDto(this User user)
        {
            if (user == null) return null;
            
            return new UserInfoDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Username,
                IsAdmin = false // Default value
            };
        }
        
        // Convert MovieUser to UserInfoDto
        public static UserInfoDto ToUserInfoDto(this MovieUser movieUser)
        {
            if (movieUser == null) return null;
            
            return new UserInfoDto
            {
                Id = movieUser.user_id,
                Email = movieUser.email,
                Name = movieUser.name,
                IsAdmin = movieUser.isAdmin == 1
            };
        }

        // UserInfoDto can be used directly as UserDto (they're identical)
        public static UserInfoDto ToUserDto(this UserInfoDto userInfo)
        {
            return userInfo; // No conversion needed
        }

        // Convert MovieUserDto to UserDto
        public static UserDto ToUserDto(this MovieUserDto movieUserDto)
        {
            if (movieUserDto == null) return null;
            
            return new UserDto
            {
                Id = movieUserDto.Id,
                Email = movieUserDto.Email,
                Name = movieUserDto.Name,
                IsAdmin = movieUserDto.IsAdmin
            };
        }
    }
} 